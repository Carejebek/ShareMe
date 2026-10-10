import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getPlatformFeePercent } from "@/lib/settings";

const schema = z.object({ platformFeePercent: z.number().min(0).max(100) });

// PATCH /api/admin/settings  { platformFeePercent }
export async function PATCH(req: NextRequest) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The fee must be between 0 and 100%." }, { status: 400 });

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
