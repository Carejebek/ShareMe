import { NextRequest, NextResponse } from 'next/server';
import { fetchRouteImage, MapsError, validRouteImageSignature } from '@/lib/maps';
import { clientIp, rateLimit } from '@/lib/rateLimit';

// GET /api/maps/route-image?p=<encoded polyline>&sig=<signature from the quote API>
// Proxies a Google Static Maps image so the API key never reaches the browser.
export async function GET(req: NextRequest) {
  if (!rateLimit(`routeimg:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const polyline = req.nextUrl.searchParams.get('p') || '';
  const sig = req.nextUrl.searchParams.get('sig') || '';
  if (!polyline || polyline.length > 6000 || !validRouteImageSignature(polyline, sig)) {
    return NextResponse.json({ error: 'Invalid map request.' }, { status: 400 });
  }

  try {
    const image = await fetchRouteImage(polyline);
    return new NextResponse(image, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' }
    });
  } catch (err) {
    const status = err instanceof MapsError ? err.status : 500;
    return NextResponse.json({ error: 'Map unavailable.' }, { status });
  }
}
