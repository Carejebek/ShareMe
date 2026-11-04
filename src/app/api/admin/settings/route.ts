import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getPlatformFeePercent, getRidePricing, RIDE_PRICING_KEYS } from "@/lib/settings";

const amount = (label: string, max: number) =>
  z
    .number({ invalid_type_error: `${label} is required (use 0 for none).` })
    .min(0, `${label} can't be negative.`)
    .max(max, `${label} can be at most ${max}.`);

const ridePricingSchema = z.object({
  rideBaseFare: amount("Base fare", 1000),
  ridePerMinute: amount("Per-minute rate", 100),
  ridePerDistance: amount("Distance rate", 100),
  rideDistanceUnit: z.enum(["km", "mi"]),
  rideBookingFee: amount("Booking fee", 1000),
  rideMinimumFare: amount("Minimum fare", 1000),
});

const schema = z.union([
  z.object({ platformFeePercent: z.number().min(0).max(100) }),
  z.object({
    supportEmail: z.string().trim().max(200).refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address."),
    supportPhone: z.string().trim().max(40),
    supportHours: z.string().trim().max(200),
  }),
]);

// PATCH /api/admin/settings  { platformFeePercent } | { supportEmail, supportPhone, supportHours } | { ride… pricing }
export async function PATCH(req: NextRequest) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const body = await req.json().catch(() => null);

  // Checked on its own so the admin sees which price is wrong (a union only says "Invalid input").
  if (body && typeof body === "object" && "rideBaseFare" in body) {
    const pricing = ridePricingSchema.safeParse(body);
    if (!pricing.success) {
      return NextResponse.json({ error: pricing.error.issues[0]?.message ?? "Check the prices." }, { status: 400 });
    }
    return saveRidePricing(admin.id, pricing.data);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "The fee must be between 0 and 100%." }, { status: 400 });
  }

  if ("supportEmail" in parsed.data) {
    const { supportEmail, supportPhone, supportHours } = parsed.data;
    const entries = { "support.email": supportEmail, "support.phone": supportPhone, "support.hours": supportHours };
    await prisma.$transaction(
      Object.entries(entries).map(([key, value]) =>
        value
          ? prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
          : prisma.setting.deleteMany({ where: { key } })
      )
    );
    await logAudit(admin.id, "setting.update", "SETTING", "support", entries);
    return NextResponse.json({ success: true });
  }

  const before = await getPlatformFeePercent();
  const value = String(Math.round(parsed.data.platformFeePercent * 100) / 100);
  await prisma.setting.upsert({
    where: { key: "platformFeePercent" },
    create: { key: "platformFeePercent", value },
    update: { value },
  });
  await logAudit(admin.id, "setting.update", "SETTING", "platformFeePercent", { from: before, to: Number(value) });

  return NextResponse.json({ success: true });
}

async function saveRidePricing(adminId: string, d: z.infer<typeof ridePricingSchema>) {
  const round = (n: number) => String(Math.round(n * 100) / 100);
  const entries = {
    [RIDE_PRICING_KEYS.baseFare]: round(d.rideBaseFare),
    [RIDE_PRICING_KEYS.perMinute]: round(d.ridePerMinute),
    [RIDE_PRICING_KEYS.perDistance]: round(d.ridePerDistance),
    [RIDE_PRICING_KEYS.distanceUnit]: d.rideDistanceUnit,
    [RIDE_PRICING_KEYS.bookingFee]: round(d.rideBookingFee),
    [RIDE_PRICING_KEYS.minimumFare]: round(d.rideMinimumFare),
  };
  // Stripe can't hold or charge less than 0.50, so the cheapest possible ride must cost at least that.
  if (d.rideMinimumFare + d.rideBookingFee < 0.5) {
    return NextResponse.json(
      { error: "The minimum fare plus the booking fee must be at least 0.50 (the smallest card charge Stripe allows)." },
      { status: 400 }
    );
  }
  const before = await getRidePricing();
  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) => prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }))
  );
  await logAudit(adminId, "setting.update", "SETTING", "ridePricing", { from: { ...before }, to: entries });
  return NextResponse.json({ success: true });
}
