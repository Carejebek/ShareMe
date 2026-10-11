import { NextResponse } from 'next/server';
import { activeDriverWhere, getActiveDriver } from '@/lib/drivers';
import { prisma } from '@/lib/prisma';
import { runRideJobsSoon } from '@/lib/rideJobs';
import { getSessionUser, serializeRide } from '@/lib/rides';
import { getPlatformFeePercent } from '@/lib/settings';

// GET /api/dispatch/rides
//  - ADMIN: every ride + the list of drivers who can be assigned
//  - approved DRIVER: open rides anyone can accept + their own rides
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const isAdmin = user.role === 'ADMIN';
  if (!isAdmin) {
    const { driver, reason } = await getActiveDriver(user.id);
    if (!driver) return NextResponse.json({ error: reason, apply: true }, { status: 403 });
  }
  runRideJobsSoon();

  const include = {
    rider: { select: { name: true } },
    driver: { select: { id: true, name: true, phone: true } }
  };
  const feePercent = await getPlatformFeePercent();

  if (isAdmin) {
    const [rides, drivers] = await Promise.all([
      prisma.ride.findMany({ where: { status: { not: 'AWAITING_PAYMENT' } }, include, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.user.findMany({
        where: activeDriverWhere(),
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' }
      })
    ]);
    return NextResponse.json({ role: user.role, userId: user.id, feePercent, rides: rides.map(serializeRide), drivers });
  }

  const rides = await prisma.ride.findMany({
    where: { OR: [{ status: 'REQUESTED', driverId: null, riderId: { not: user.id } }, { driverId: user.id }] },
    include,
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    take: 100
  });

  // Riders' phone numbers are only shared with the driver who accepted the ride.
  const safe = rides.map((r) => {
    const s = serializeRide(r);
    return r.driverId === user.id ? s : { ...s, riderPhone: null };
  });
  return NextResponse.json({ role: user.role, userId: user.id, feePercent, rides: safe, drivers: [] });
}
