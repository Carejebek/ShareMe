import { NextRequest, NextResponse } from 'next/server';
import { MapsError, reverseGeocode } from '@/lib/maps';
import { clientIp, rateLimit } from '@/lib/rateLimit';

// GET /api/maps/reverse?lat=..&lng=..  -> { placeId, address } for "Use my current location"
export async function GET(req: NextRequest) {
  if (!rateLimit(`reverse:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'Invalid location.' }, { status: 400 });
  }

  try {
    // ~11 m precision is plenty for a street address and avoids sending more detail than needed.
    const place = await reverseGeocode(Number(lat.toFixed(4)), Number(lng.toFixed(4)));
    return NextResponse.json({ placeId: place.placeId, address: place.description });
  } catch (err) {
    const status = err instanceof MapsError ? err.status : 500;
    const message = err instanceof MapsError ? err.message : 'Could not look up your location.';
    return NextResponse.json({ error: message }, { status });
  }
}
