import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const approvalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
  reason: z.string().trim().max(1000).optional(),
});

// PATCH /api/admin/listings/:id/approval  { status, reason? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const parsed = approvalSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid approval status" }, { status: 400 });
  const { status, reason } = parsed.data;

  if (status === "REJECTED" && !reason) {
    return NextResponse.json({ error: "Please give the host a reason for the rejection." }, { status: 400 });
  }

  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { host: { select: { verificationStatus: true } } },
  });
  if (!listing) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

  if (status === "APPROVED" && listing.host.verificationStatus !== "VERIFIED") {
    return NextResponse.json(
      { error: "The host's driver's licence must be verified before this car can be approved." },
      { status: 409 }
    );
  }

  await prisma.listing.update({
    where: { id },
    data: { approvalStatus: status, rejectionReason: status === "REJECTED" ? reason : null },
  });
  await logAudit(admin.id, `listing.${status === "APPROVED" ? "approve" : status === "REJECTED" ? "reject" : "pending"}`, "LISTING", id, reason ? { reason } : undefined);

  return NextResponse.json({ success: true });
}
