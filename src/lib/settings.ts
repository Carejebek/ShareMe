import { prisma } from "@/lib/prisma";
import { DEFAULT_RIDE_PRICING, type RidePricing } from "@/lib/pricing";

export const DEFAULT_PLATFORM_FEE_PERCENT = 20;

export async function getPlatformFeePercent(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: "platformFeePercent" } });
  const value = row ? Number(row.value) : NaN;
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : DEFAULT_PLATFORM_FEE_PERCENT;
}

// Splits what the renter actually paid (after refunds) into the platform's fee and the host's share.
export function splitEarnings(netPaid: number, feePercent: number) {
  const platformFee = Math.round(netPaid * feePercent) / 100;
  return { platformFee, hostEarnings: Math.round((netPaid - platformFee) * 100) / 100 };
}

export type SupportContact = { email: string; phone: string; hours: string };

// Contact details shown on the public Support page, set in Admin → Settings.
export async function getSupportContact(): Promise<SupportContact> {
  const rows = await prisma.setting.findMany({ where: { key: { in: ["support.email", "support.phone", "support.hours"] } } });
  const value = (key: string) => rows.find((r) => r.key === key)?.value ?? "";
  return { email: value("support.email"), phone: value("support.phone"), hours: value("support.hours") };
}

// Ride pricing, set in Admin → Settings. Anything not set falls back to DEFAULT_RIDE_PRICING (.env).
export const RIDE_PRICING_KEYS = {
  baseFare: "ride.baseFare",
  perMinute: "ride.perMinute",
  perDistance: "ride.perDistance",
  distanceUnit: "ride.distanceUnit",
  bookingFee: "ride.bookingFee",
  minimumFare: "ride.minimumFare",
} as const;

export async function getRidePricing(): Promise<RidePricing> {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(RIDE_PRICING_KEYS) } } });
  const get = (key: string) => rows.find((r) => r.key === key)?.value;
  const amount = (key: string, fallback: number) => {
    const n = Number(get(key));
    return get(key) !== undefined && Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const d = DEFAULT_RIDE_PRICING;
  return {
    baseFare: amount(RIDE_PRICING_KEYS.baseFare, d.baseFare),
    perMinute: amount(RIDE_PRICING_KEYS.perMinute, d.perMinute),
    perDistance: amount(RIDE_PRICING_KEYS.perDistance, d.perDistance),
    distanceUnit: get(RIDE_PRICING_KEYS.distanceUnit) === "mi" ? "mi" : d.distanceUnit,
    bookingFee: amount(RIDE_PRICING_KEYS.bookingFee, d.bookingFee),
    minimumFare: amount(RIDE_PRICING_KEYS.minimumFare, d.minimumFare),
    currency: d.currency,
  };
}
