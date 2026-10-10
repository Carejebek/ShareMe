import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DENIED"]),
  resolution: z.string().trim().max(2000).optional(),
  amountApproved: z.number().min(0).multipleOf(0.01).nullable().optional(),
});

// PATCH /api/admin/claims/:id  { status, resolution?, amountApproved? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { status, resolution, amountApproved } = parsed.data;

  if ((status === "RESOLVED" || status === "DENIED") && !resolution) {
    return NextResponse.json({ error: "Explain the decision — the person who filed the claim will see it." }, { status: 400 });
  }

  const { id } = await params;
  const claim = await prisma.claim.findUnique({ where: { id }, select: { status: true } });
  if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });

  await prisma.claim.update({
    where: { id },
    data: {
      status,
      resolution: resolution || null,
      amountApproved: status === "RESOLVED" ? amountApproved ?? null : null,
    },
  });
  await logAudit(admin.id, "claim.update", "CLAIM", id, {
    from: claim.status,
    to: status,
    ...(resolution ? { resolution } : {}),
    ...(amountApproved != null ? { amountApproved } : {}),
  });

  return NextResponse.json({ success: true });
}
