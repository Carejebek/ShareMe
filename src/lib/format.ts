export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  const km = meters / 1000;
  return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
}

export function formatWhen(scheduledAt: string | null): string {
  if (!scheduledAt) return 'As soon as possible';
  return new Date(scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Looking for a driver',
  ACCEPTED: 'Driver assigned',
  EN_ROUTE: 'Driver on the way',
  IN_PROGRESS: 'Trip in progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const STATUS_STYLE: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  EN_ROUTE: 'bg-indigo-100 text-indigo-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

export function mapsDirectionsUrl(r: {
  pickupAddress: string;
  pickupPlaceId: string;
  dropoffAddress: string;
  dropoffPlaceId: string;
}): string {
  const q = new URLSearchParams({
    api: '1',
    origin: r.pickupAddress,
    origin_place_id: r.pickupPlaceId,
    destination: r.dropoffAddress,
    destination_place_id: r.dropoffPlaceId
  });
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}
