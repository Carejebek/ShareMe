import { createHmac, timingSafeEqual } from 'crypto';
import { getMapsApiKey } from '@/lib/integrations';

// Google Maps Platform helpers (server-side only; the key never reaches the browser).
// Enable these two APIs on the key's Google Cloud project:
//   - Places API (New)   -> address search
//   - Routes API         -> drive time and distance
//   - Maps Static API    -> route preview image on the ride page (optional)
//   - Geocoding API      -> "Use my current location" turns GPS coordinates into a pickup address
// Key: set on Admin → Integrations, or GOOGLE_MAPS_API_KEY in .env
//      RIDE_REGION_CODES=us,gh  (optional, limits address search to these countries)
//      RIDE_TRAFFIC_AWARE=1     (optional, uses live/predicted traffic; costs more per request)

export class MapsError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export interface AddressSuggestion {
  placeId: string;
  description: string;
  main: string;
  secondary: string;
}

export interface RouteInfo {
  durationSeconds: number;
  distanceMeters: number;
  polyline: string; // Google encoded polyline of the driving route ('' if unavailable)
}

const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/;
export const isValidPlaceId = (id: unknown): id is string =>
  typeof id === 'string' && PLACE_ID_RE.test(id);

async function apiKey(): Promise<string> {
  const key = await getMapsApiKey();
  if (!key) throw new MapsError('Address search is not configured yet.', 503);
  return key;
}

export async function autocomplete(input: string, sessionToken?: string): Promise<AddressSuggestion[]> {
  const regions = (process.env.RIDE_REGION_CODES || 'us,gh')
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': await apiKey() },
    body: JSON.stringify({
      input,
      ...(sessionToken ? { sessionToken } : {}),
      ...(regions.length ? { includedRegionCodes: regions.slice(0, 15) } : {})
    })
  });

  if (!res.ok) {
    console.error('Places autocomplete failed', res.status, await res.text().catch(() => ''));
    throw new MapsError('Address search is unavailable right now.');
  }

  const data = (await res.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId: string;
        text?: { text?: string };
        structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
      };
    }[];
  };

  return (data.suggestions || [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p && !!p.placeId)
    .map((p) => ({
      placeId: p.placeId,
      description: p.text?.text || '',
      main: p.structuredFormat?.mainText?.text || p.text?.text || '',
      secondary: p.structuredFormat?.secondaryText?.text || ''
    }));
}

// Turns the rider's GPS position into the nearest street address and its place ID, so a pickup
// chosen by location goes through exactly the same pricing path as a typed address.
export async function reverseGeocode(lat: number, lng: number): Promise<AddressSuggestion> {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    result_type: 'street_address|premise|subpremise|route',
    key: await apiKey()
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    error_message?: string;
    results?: { place_id: string; formatted_address: string }[];
  };
  if (!res.ok || (data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) {
    console.error('Reverse geocoding failed', res.status, data.status, data.error_message);
    throw new MapsError('Could not look up your location right now.');
  }
  const result = data.results?.[0];
  if (!result || !isValidPlaceId(result.place_id)) {
    throw new MapsError('No street address was found at your location. Please type your pickup address.', 422);
  }
  const [main, ...rest] = result.formatted_address.split(', ');
  return { placeId: result.place_id, description: result.formatted_address, main, secondary: rest.join(', ') };
}

export async function computeRoute(
  originPlaceId: string,
  destinationPlaceId: string,
  departureTime?: Date | null
): Promise<RouteInfo> {
  const trafficAware = process.env.RIDE_TRAFFIC_AWARE === '1';
  const body: Record<string, unknown> = {
    origin: { placeId: originPlaceId },
    destination: { placeId: destinationPlaceId },
    travelMode: 'DRIVE',
    routingPreference: trafficAware ? 'TRAFFIC_AWARE' : 'TRAFFIC_UNAWARE'
  };
  if (trafficAware && departureTime && departureTime.getTime() > Date.now() + 60_000) {
    body.departureTime = departureTime.toISOString();
  }

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': await apiKey(),
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error('Routes API failed', res.status, await res.text().catch(() => ''));
    throw new MapsError('Could not calculate the route right now.');
  }

  const data = (await res.json()) as {
    routes?: { duration?: string; distanceMeters?: number; polyline?: { encodedPolyline?: string } }[];
  };
  const route = data.routes?.[0];
  const seconds = route?.duration ? parseInt(route.duration.replace('s', ''), 10) : NaN;
  if (!route || !Number.isFinite(seconds)) {
    throw new MapsError('No driving route was found between those addresses.', 422);
  }

  return {
    durationSeconds: seconds,
    distanceMeters: route.distanceMeters ?? 0,
    polyline: route.polyline?.encodedPolyline ?? ''
  };
}

// Route preview images. The quote API hands the browser a signed URL for the route it just priced,
// so /api/maps/route-image can't be used to draw arbitrary maps on our key.
function mapSignature(polyline: string): string {
  const secret = process.env.INTEGRATIONS_SECRET || process.env.NEXTAUTH_SECRET || '';
  return createHmac('sha256', `route-map:${secret}`).update(polyline).digest('base64url').slice(0, 32);
}

export function routeImageUrl(polyline: string): string | null {
  if (!polyline || polyline.length > 6000) return null;
  return `/api/maps/route-image?p=${encodeURIComponent(polyline)}&sig=${mapSignature(polyline)}`;
}

export function validRouteImageSignature(polyline: string, sig: string): boolean {
  const expected = Buffer.from(mapSignature(polyline));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function fetchRouteImage(polyline: string): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    size: '640x320',
    scale: '2',
    maptype: 'roadmap',
    path: `color:0xff5a1fff|weight:5|enc:${polyline}`,
    key: await apiKey()
  });
  // Start (green) and end (red) markers from the polyline's first and last points.
  const points = decodePolyline(polyline);
  if (points.length) {
    const [a, b] = [points[0], points[points.length - 1]];
    params.append('markers', `color:0x16a34a|label:A|${a[0]},${a[1]}`);
    params.append('markers', `color:0xdc2626|label:B|${b[0]},${b[1]}`);
  }
  const res = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${params}`);
  if (!res.ok || !(res.headers.get('content-type') || '').startsWith('image/')) {
    console.error('Static map failed', res.status, await res.text().catch(() => ''));
    throw new MapsError('The route map is unavailable right now.');
  }
  return res.arrayBuffer();
}

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0, shift = 0, byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}
