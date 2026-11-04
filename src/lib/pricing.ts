// Ride pricing rule (Uber/Lyft style):
//   fare  = base fare + (minutes × per-minute rate) + (distance × per-km or per-mile rate)
//   fare  = at least the minimum fare
//   total = fare + booking fee
// Admins set the rates on Admin → Settings. Until they do, the .env values below are used
// (defaults: $1.00 per minute, $5.00 minimum, nothing else), so prices don't change on upgrade:
//   RIDE_RATE_PER_MINUTE=1   RIDE_MIN_FARE=5   RIDE_CURRENCY=USD
// This file has no database access so the admin pricing preview can use it in the browser.

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const RIDE_RATE_PER_MINUTE = num(process.env.RIDE_RATE_PER_MINUTE, 1);
export const RIDE_MIN_FARE = num(process.env.RIDE_MIN_FARE, 5);
export const RIDE_CURRENCY = process.env.RIDE_CURRENCY || 'USD';

export type DistanceUnit = 'km' | 'mi';
const METERS_PER: Record<DistanceUnit, number> = { km: 1000, mi: 1609.344 };

export interface RidePricing {
  baseFare: number;
  perMinute: number;
  perDistance: number; // per km or per mile, see distanceUnit
  distanceUnit: DistanceUnit;
  bookingFee: number;
  minimumFare: number;
  currency: string;
}

export const DEFAULT_RIDE_PRICING: RidePricing = {
  baseFare: 0,
  perMinute: RIDE_RATE_PER_MINUTE,
  perDistance: 0,
  distanceUnit: 'km',
  bookingFee: 0,
  minimumFare: RIDE_MIN_FARE,
  currency: RIDE_CURRENCY
};

export interface Fare {
  minutes: number; // billable minutes (always rounded UP, at least 1)
  ratePerMinute: number;
  minimumFare: number;
  baseFare: number;
  timeCharge: number; // minutes x rate
  distance: number; // in distanceUnit, 1 decimal
  distanceUnit: DistanceUnit;
  perDistance: number;
  distanceCharge: number;
  bookingFee: number;
  subtotal: number; // base + time + distance, before the minimum
  total: number; // what the rider pays
  minimumApplied: boolean;
  currency: string;
}

const cents = (n: number) => Math.round(n * 100) / 100;

export function calculateFare(durationSeconds: number, distanceMeters: number, pricing: RidePricing): Fare {
  const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const distance = Math.round((Math.max(0, distanceMeters) / METERS_PER[pricing.distanceUnit]) * 10) / 10;
  const timeCharge = cents(minutes * pricing.perMinute);
  const distanceCharge = cents(distance * pricing.perDistance);
  const subtotal = cents(pricing.baseFare + timeCharge + distanceCharge);
  const fare = Math.max(subtotal, pricing.minimumFare);
  return {
    minutes,
    ratePerMinute: pricing.perMinute,
    minimumFare: pricing.minimumFare,
    baseFare: pricing.baseFare,
    timeCharge,
    distance,
    distanceUnit: pricing.distanceUnit,
    perDistance: pricing.perDistance,
    distanceCharge,
    bookingFee: pricing.bookingFee,
    subtotal,
    total: cents(fare + pricing.bookingFee),
    minimumApplied: pricing.minimumFare > subtotal,
    currency: pricing.currency
  };
}

// One line for public pages, e.g. "$2.00 base + $0.30 per minute + $0.80 per km, minimum $5.00".
export function describePricing(p: RidePricing, money: (n: number) => string): string {
  const parts = [
    p.baseFare > 0 ? `${money(p.baseFare)} base` : '',
    p.perMinute > 0 ? `${money(p.perMinute)} per minute` : '',
    p.perDistance > 0 ? `${money(p.perDistance)} per ${p.distanceUnit === 'mi' ? 'mile' : 'km'}` : ''
  ].filter(Boolean);
  const extras = [
    p.bookingFee > 0 ? `plus a ${money(p.bookingFee)} booking fee` : '',
    p.minimumFare > 0 ? `minimum ${money(p.minimumFare)}` : ''
  ].filter(Boolean);
  return [parts.join(' + ') || 'A set price', ...extras].join(', ');
}
