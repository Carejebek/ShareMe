// Ride pricing rule: a flat rate per estimated minute of driving, with a minimum fare.
// Defaults: $1.00 per minute, $5.00 minimum. Override in .env without a code change:
//   RIDE_RATE_PER_MINUTE=1   RIDE_MIN_FARE=5   RIDE_CURRENCY=USD

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const RIDE_RATE_PER_MINUTE = num(process.env.RIDE_RATE_PER_MINUTE, 1);
export const RIDE_MIN_FARE = num(process.env.RIDE_MIN_FARE, 5);
export const RIDE_CURRENCY = process.env.RIDE_CURRENCY || 'USD';

export interface Fare {
  minutes: number; // billable minutes (always rounded UP, at least 1)
  ratePerMinute: number;
  minimumFare: number;
  subtotal: number; // minutes x rate, before the minimum
  total: number; // what the rider pays
  minimumApplied: boolean;
  currency: string;
}

const cents = (n: number) => Math.round(n * 100) / 100;

export function calculateFare(
  durationSeconds: number,
  rate: number = RIDE_RATE_PER_MINUTE,
  minimum: number = RIDE_MIN_FARE,
  currency: string = RIDE_CURRENCY
): Fare {
  const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const subtotal = cents(minutes * rate);
  const total = cents(Math.max(subtotal, minimum));
  return {
    minutes,
    ratePerMinute: rate,
    minimumFare: minimum,
    subtotal,
    total,
    minimumApplied: total > subtotal,
    currency
  };
}
