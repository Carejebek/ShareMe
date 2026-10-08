import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, serializeRide } from '@/lib/rides';

// GET /api/dispatch/rides
//  - ADMIN: every ride + the list of drivers (for assigning)
//  - DRIVER: open rides anyone can accept + their own rides
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  if (user.role !== 'ADMIN' && user.role !== 'DRIVER') {
    return NextResponse.json({ error: 'Drivers and admins only.' }, { status: 403 });
  }

  const include = {
    rider: { select: { name: true } },
    driver: { select: { id: true, name: true, phone: true } }
  };

  if (user.role === 'ADMIN') {
    const [rides, drivers] = await Promise.all([
      prisma.ride.findMany({ include, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.user.findMany({
        where: { role: 'DRIVER' },
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' }
      })
    ]);
    return NextResponse.json({ role: user.role, userId: user.id, rides: rides.map(serializeRide), drivers });
  }

  const rides = await prisma.ride.findMany({
    where: { OR: [{ status: 'REQUESTED', driverId: null }, { driverId: user.id }] },
    include,
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    take: 100
  });

  // Riders' phone numbers are only shared with the driver who accepted the ride.
  const safe = rides.map((r) => {
    const s = serializeRide(r);
    return r.driverId === user.id ? s : { ...s, riderPhone: null };
  });
  return NextResponse.json({ role: user.role, userId: user.id, rides: safe, drivers: [] });
}
