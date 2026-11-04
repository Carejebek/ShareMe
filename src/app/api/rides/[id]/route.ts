import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { notifyRideStatus } from '@/lib/notifications';
import { getActiveDriver } from '@/lib/drivers';
import { captureRideFare, releaseRideHold } from '@/lib/ridePayments';
import { FINAL_STATUSES, getSessionUser, NEXT_STATUS, serializeRide } from '@/lib/rides';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('accept') }), // driver takes an open ride
  z.object({ action: z.literal('assign'), driverId: z.string().min(1) }), // admin assigns a driver
  z.object({ action: z.literal('advance') }), // driver/admin moves to the next step
  z.object({ action: z.literal('markPaid') })
]);

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// When each step happened, for the admin ride timeline.
const STATUS_TIME = { EN_ROUTE: 'enRouteAt', IN_PROGRESS: 'startedAt', COMPLETED: 'completedAt' } as const;

// PATCH /api/rides/:id  { action: 'cancel' | 'accept' | 'assign' | 'advance' | 'markPaid', ... }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return fail('You must be signed in.', 401);

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid request.', 400);
  const body = parsed.data;

  const ride = await prisma.ride.findUnique({ where: { id } });
  if (!ride) return fail('Ride not found.', 404);

  const isAdmin = user.role === 'ADMIN';
  const isRider = ride.riderId === user.id;
  const isAssignedDriver = ride.driverId === user.id;

  switch (body.action) {
    case 'cancel': {
      if (FINAL_STATUSES.includes(ride.status)) return fail('This ride is already finished.', 409);
      const riderCanCancel = isRider && ['AWAITING_PAYMENT', 'REQUESTED', 'ACCEPTED'].includes(ride.status);
      if (!riderCanCancel && !isAdmin) return fail('You cannot cancel this ride.', 403);
      const claimed = await prisma.ride.updateMany({
        where: { id, status: ride.status },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: isRider ? 'Cancelled by rider' : 'Cancelled by JayXZ' }
      });
      if (claimed.count === 0) return fail('This ride was just updated. Refresh and try again.', 409);
      await releaseRideHold(ride);
      if (ride.status !== 'AWAITING_PAYMENT') notifyRideStatus(id, 'CANCELLED');
      if (isAdmin && !isRider) await logAudit(user.id, 'ride.cancel', 'RIDE', id, { from: ride.status });
      return NextResponse.json(serializeRide((await prisma.ride.findUnique({ where: { id } }))!));
    }

    case 'accept': {
      const { driver, reason } = await getActiveDriver(user.id);
      if (!driver) return fail(reason, 403);
      if (isRider) return fail("You can't accept your own ride.", 409);
      // updateMany with conditions so two drivers cannot both take the same ride
      const result = await prisma.ride.updateMany({
        where: { id, status: 'REQUESTED', driverId: null },
        data: { driverId: user.id, status: 'ACCEPTED', acceptedAt: new Date() }
      });
      if (result.count === 0) return fail('This ride is no longer available.', 409);
      notifyRideStatus(id, 'ACCEPTED');
      return NextResponse.json(serializeRide((await prisma.ride.findUnique({ where: { id } }))!));
    }

    case 'assign': {
      if (!isAdmin) return fail('Only an admin can assign drivers.', 403);
      if (ride.status !== 'REQUESTED' && ride.status !== 'ACCEPTED') {
        return fail('A driver can only be assigned before the trip starts.', 409);
      }
      const { driver, reason } = await getActiveDriver(body.driverId);
      if (!driver) return fail(`That driver can't take rides: ${reason}`, 400);
      if (driver.id === ride.riderId) return fail("A rider can't drive their own ride.", 400);
      const result = await prisma.ride.updateMany({
        where: { id, status: { in: ['REQUESTED', 'ACCEPTED'] } },
        data: { driverId: driver.id, status: 'ACCEPTED', acceptedAt: new Date() }
      });
      if (result.count === 0) return fail('This ride was just updated. Refresh and try again.', 409);
      if (driver.id !== ride.driverId) notifyRideStatus(id, 'ACCEPTED');
      await logAudit(user.id, 'ride.assign', 'RIDE', id, { driver: driver.name, previousDriverId: ride.driverId });
      return NextResponse.json(serializeRide((await prisma.ride.findUnique({ where: { id } }))!));
    }

    case 'advance': {
      if (!isAssignedDriver && !isAdmin) return fail('Only the assigned driver can update this ride.', 403);
      const next = NEXT_STATUS[ride.status];
      if (!next) return fail('This ride cannot be advanced.', 409);
      const result = await prisma.ride.updateMany({
        where: { id, status: ride.status },
        data: { status: next, [STATUS_TIME[next as keyof typeof STATUS_TIME]]: new Date() }
      });
      if (result.count === 0) return fail('This ride was just updated. Refresh and try again.', 409);

      // Trip finished: charge the card hold.
      let warning = '';
      if (next === 'COMPLETED' && ride.paymentStatus === 'AUTHORIZED') {
        const capture = await captureRideFare(id);
        if (!capture.ok) warning = `The trip is complete but the card charge failed (${capture.error.replace(/\.$/, '')}). An admin will follow up.`;
      }
      notifyRideStatus(id, next);
      if (isAdmin && !isAssignedDriver) await logAudit(user.id, 'ride.advance', 'RIDE', id, { from: ride.status, to: next, warning });
      return NextResponse.json({ ...serializeRide((await prisma.ride.findUnique({ where: { id } }))!), warning });
    }

    case 'markPaid': {
      // Only for older rides booked before card payments, which riders paid in cash.
      if (!isAssignedDriver && !isAdmin) return fail('Only the driver or an admin can mark a ride paid.', 403);
      if (ride.status !== 'COMPLETED') return fail('Only completed rides can be marked paid.', 409);
      if (ride.paymentStatus !== 'UNPAID') return fail('This ride is paid by card.', 409);
      const updated = await prisma.ride.update({ where: { id }, data: { paid: true } });
      return NextResponse.json(serializeRide(updated));
    }
  }
}
