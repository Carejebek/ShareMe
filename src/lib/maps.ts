// Google Maps Platform helpers (server-side only; the key never reaches the browser).
// Enable these two APIs on the key's Google Cloud project:
//   - Places API (New)   -> address search
//   - Routes API         -> drive time and distance
// Env: GOOGLE_MAPS_API_KEY (required)
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
}

const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/;
export const isValidPlaceId = (id: unknown): id is string =>
  typeof id === 'string' && PLACE_ID_RE.test(id);

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
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
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey() },
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
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error('Routes API failed', res.status, await res.text().catch(() => ''));
    throw new MapsError('Could not calculate the route right now.');
  }

  const data = (await res.json()) as { routes?: { duration?: string; distanceMeters?: number }[] };
  const route = data.routes?.[0];
  const seconds = route?.duration ? parseInt(route.duration.replace('s', ''), 10) : NaN;
  if (!route || !Number.isFinite(seconds)) {
    throw new MapsError('No driving route was found between those addresses.', 422);
  }

  return { durationSeconds: seconds, distanceMeters: route.distanceMeters ?? 0 };
}
