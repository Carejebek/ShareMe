import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { FINAL_STATUSES, getSessionUser, NEXT_STATUS, serializeRide } from '@/lib/rides';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('accept') }), // driver takes an open ride
  z.object({ action: z.literal('assign'), driverId: z.string().min(1) }), // admin assigns a driver
  z.object({ action: z.literal('advance') }), // driver/admin moves to the next step
  z.object({ action: z.literal('markPaid') })
]);

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

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
      const riderCanCancel = isRider && (ride.status === 'REQUESTED' || ride.status === 'ACCEPTED');
      if (!riderCanCancel && !isAdmin) return fail('You cannot cancel this ride.', 403);
      const updated = await prisma.ride.update({ where: { id }, data: { status: 'CANCELLED' } });
      return NextResponse.json(serializeRide(updated));
    }

    case 'accept': {
      if (user.role !== 'DRIVER' && !isAdmin) return fail('Only drivers can accept rides.', 403);
      // updateMany with conditions so two drivers cannot both take the same ride
      const result = await prisma.ride.updateMany({
        where: { id, status: 'REQUESTED', driverId: null },
        data: { driverId: user.id, status: 'ACCEPTED' }
      });
      if (result.count === 0) return fail('This ride is no longer available.', 409);
      return NextResponse.json(serializeRide((await prisma.ride.findUnique({ where: { id } }))!));
    }

    case 'assign': {
      if (!isAdmin) return fail('Only an admin can assign drivers.', 403);
      if (ride.status !== 'REQUESTED' && ride.status !== 'ACCEPTED') {
        return fail('A driver can only be assigned before the trip starts.', 409);
      }
      const driver = await prisma.user.findUnique({ where: { id: body.driverId } });
      if (!driver || driver.role !== 'DRIVER') return fail('That user is not a driver.', 400);
      const updated = await prisma.ride.update({
        where: { id },
        data: { driverId: driver.id, status: 'ACCEPTED' }
      });
      return NextResponse.json(serializeRide(updated));
    }

    case 'advance': {
      if (!isAssignedDriver && !isAdmin) return fail('Only the assigned driver can update this ride.', 403);
      const next = NEXT_STATUS[ride.status];
      if (!next) return fail('This ride cannot be advanced.', 409);
      const updated = await prisma.ride.update({ where: { id }, data: { status: next } });
      return NextResponse.json(serializeRide(updated));
    }

    case 'markPaid': {
      if (!isAssignedDriver && !isAdmin) return fail('Only the driver or an admin can mark a ride paid.', 403);
      if (ride.status !== 'COMPLETED') return fail('Only completed rides can be marked paid.', 409);
      const updated = await prisma.ride.update({ where: { id }, data: { paid: true } });
      return NextResponse.json(serializeRide(updated));
    }
  }
}
