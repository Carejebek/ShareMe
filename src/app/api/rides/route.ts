import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { computeRoute, isValidPlaceId, MapsError } from '@/lib/maps';
import { calculateFare } from '@/lib/pricing';
import { getRidePricing } from '@/lib/settings';
import { createRideHold, MAX_SCHEDULE_DAYS } from '@/lib/ridePayments';
import { runRideJobsSoon } from '@/lib/rideJobs';
import { getSessionUser, serializeRide } from '@/lib/rides';

const MIN_LEAD_MINUTES = 15; // scheduled rides must be at least this far ahead
const MAX_ACTIVE_RIDES = 5;

const createSchema = z.object({
  pickupPlaceId: z.string().refine(isValidPlaceId),
  pickupAddress: z.string().min(3).max(300),
  dropoffPlaceId: z.string().refine(isValidPlaceId),
  dropoffAddress: z.string().min(3).max(300),
  scheduledAt: z.string().datetime().optional().nullable(), // omit = as soon as possible
  phone: z.string().min(7).max(30),
  notes: z.string().max(500).optional().nullable()
});

// GET /api/rides - the signed-in rider's rides
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  runRideJobsSoon();
  const rides = await prisma.ride.findMany({
    // Rides whose checkout was never finished aren't shown.
    where: { riderId: user.id, status: { not: 'AWAITING_PAYMENT' } },
    include: {
      driver: {
        select: {
          name: true,
          phone: true,
          driverProfile: { select: { vehicleMake: true, vehicleModel: true, vehicleYear: true, vehicleColor: true, vehiclePlate: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  return NextResponse.json(rides.map(serializeRide));
}

// POST /api/rides - book a ride. The price is recalculated here; the client's number is never trusted.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }
  const d = parsed.data;

  if (d.pickupPlaceId === d.dropoffPlaceId) {
    return NextResponse.json({ error: 'Pickup and drop-off cannot be the same place.' }, { status: 400 });
  }

  let scheduledAt: Date | null = null;
  if (d.scheduledAt) {
    scheduledAt = new Date(d.scheduledAt);
    if (scheduledAt.getTime() < Date.now() + MIN_LEAD_MINUTES * 60_000) {
      return NextResponse.json(
        { error: `Scheduled rides must be at least ${MIN_LEAD_MINUTES} minutes from now.` },
        { status: 400 }
      );
    }
    if (scheduledAt.getTime() > Date.now() + MAX_SCHEDULE_DAYS * 24 * 60 * 60_000) {
      return NextResponse.json(
        { error: `Rides can be scheduled up to ${MAX_SCHEDULE_DAYS} days ahead.` },
        { status: 400 }
      );
    }
  }

  const active = await prisma.ride.count({
    where: { riderId: user.id, status: { in: ['AWAITING_PAYMENT', 'REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'] } }
  });
  if (active >= MAX_ACTIVE_RIDES) {
    return NextResponse.json({ error: 'You have too many active rides. Cancel or finish one first.' }, { status: 429 });
  }

  try {
    const route = await computeRoute(d.pickupPlaceId, d.dropoffPlaceId, scheduledAt);
    const fare = calculateFare(route.durationSeconds, route.distanceMeters, await getRidePricing());

    const ride = await prisma.ride.create({
      data: {
        riderId: user.id,
        pickupPlaceId: d.pickupPlaceId,
        pickupAddress: d.pickupAddress,
        dropoffPlaceId: d.dropoffPlaceId,
        dropoffAddress: d.dropoffAddress,
        scheduledAt,
        riderPhone: d.phone,
        notes: d.notes || null,
        distanceMeters: route.distanceMeters,
        durationMinutes: fare.minutes,
        ratePerMinute: fare.ratePerMinute,
        minimumFare: fare.minimumFare,
        totalPrice: fare.total,
        currency: fare.currency,
        fareBreakdown: { ...fare },
        routePolyline: route.polyline || null,
        // Drivers only see the ride once the card hold succeeds.
        status: 'AWAITING_PAYMENT'
      }
    });

    try {
      const intent = await createRideHold(ride);
      return NextResponse.json({ ...serializeRide(ride), clientSecret: intent.client_secret }, { status: 201 });
    } catch (err) {
      console.error('Creating ride card hold failed:', err);
      await prisma.ride.update({ where: { id: ride.id }, data: { status: 'CANCELLED', cancelReason: 'Card payment unavailable' } });
      return NextResponse.json({ error: 'Card payments are unavailable right now. Please try again later.' }, { status: 503 });
    }
  } catch (err) {
    const status = err instanceof MapsError ? err.status : 500;
    const message = err instanceof MapsError ? err.message : 'Could not book the ride.';
    return NextResponse.json({ error: message }, { status });
  }
}
