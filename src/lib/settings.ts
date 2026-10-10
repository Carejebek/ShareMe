import { prisma } from "@/lib/prisma";

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
