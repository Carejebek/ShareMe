import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computeRoute, isValidPlaceId, MapsError } from '@/lib/maps';
import { calculateFare } from '@/lib/pricing';
import { clientIp, rateLimit } from '@/lib/rateLimit';

const quoteSchema = z.object({
  pickupPlaceId: z.string().refine(isValidPlaceId, 'Invalid pickup address'),
  dropoffPlaceId: z.string().refine(isValidPlaceId, 'Invalid drop-off address'),
  scheduledAt: z.string().datetime().optional().nullable()
});

// POST /api/rides/quote - price preview (nothing is saved)
export async function POST(req: NextRequest) {
  if (!rateLimit(`quote:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please choose both addresses.' }, { status: 400 });
  }
  const { pickupPlaceId, dropoffPlaceId, scheduledAt } = parsed.data;

  if (pickupPlaceId === dropoffPlaceId) {
    return NextResponse.json({ error: 'Pickup and drop-off cannot be the same place.' }, { status: 400 });
  }

  try {
    const route = await computeRoute(
      pickupPlaceId,
      dropoffPlaceId,
      scheduledAt ? new Date(scheduledAt) : null
    );
    const fare = calculateFare(route.durationSeconds);
    return NextResponse.json({
      distanceMeters: route.distanceMeters,
      durationMinutes: fare.minutes,
      fare
    });
  } catch (err) {
    const status = err instanceof MapsError ? err.status : 500;
    const message = err instanceof MapsError ? err.message : 'Could not calculate the price.';
    return NextResponse.json({ error: message }, { status });
  }
}
