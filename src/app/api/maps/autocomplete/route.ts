import { NextRequest, NextResponse } from 'next/server';
import { autocomplete, MapsError } from '@/lib/maps';
import { clientIp, rateLimit } from '@/lib/rateLimit';

// GET /api/maps/autocomplete?q=123+main&s=<session token>
export async function GET(req: NextRequest) {
  if (!rateLimit(`ac:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many searches. Please slow down.' }, { status: 429 });
  }

  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const s = req.nextUrl.searchParams.get('s') || undefined;
  if (q.length < 3 || q.length > 200) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await autocomplete(q, s && /^[A-Za-z0-9-]{8,64}$/.test(s) ? s : undefined);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const status = err instanceof MapsError ? err.status : 500;
    const message = err instanceof MapsError ? err.message : 'Address search failed.';
    return NextResponse.json({ error: message }, { status });
  }
}
