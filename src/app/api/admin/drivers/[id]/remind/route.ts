import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { reminderStage, sendInsuranceReminder } from "@/lib/driverDocs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

// POST /api/admin/drivers/:profileId/remind — text a driver about their insurance now.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  if (!rateLimit(`insurance-remind:${id}`, 3, 60 * 60_000)) {
    return NextResponse.json({ error: "This driver was texted several times in the last hour. Try again later." }, { status: 429 });
  }
  const profile = await prisma.driverProfile.findUnique({ where: { id }, select: { id: true, userId: true, insuranceExpiresAt: true } });
  if (!profile) return NextResponse.json({ error: "Driver not found." }, { status: 404 });
  const stage = reminderStage(profile.insuranceExpiresAt);
  if (stage === null) return NextResponse.json({ error: "Their insurance isn't expiring within 30 days." }, { status: 409 });

  const result = await sendInsuranceReminder(profile.id, stage, { manual: true });
  await logAudit(admin.id, "driver.insurance_reminder", "USER", profile.userId, { stage, ok: result.ok, error: result.error || undefined });
  if (!result.ok) return NextResponse.json({ error: `The text wasn't sent: ${result.error}` }, { status: 502 });
  return NextResponse.json({ success: true });
}
