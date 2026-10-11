import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getPlatformFeePercent } from "@/lib/settings";

const schema = z.union([
  z.object({ platformFeePercent: z.number().min(0).max(100) }),
  z.object({
    supportEmail: z.string().trim().max(200).refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address."),
    supportPhone: z.string().trim().max(40),
    supportHours: z.string().trim().max(200),
  }),
]);

// PATCH /api/admin/settings  { platformFeePercent } | { supportEmail, supportPhone, supportHours }
export async function PATCH(req: NextRequest) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
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
