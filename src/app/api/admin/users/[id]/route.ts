import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), role: z.enum(["RENTER", "HOST", "DRIVER", "ADMIN"]) }),
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(1, "Please give a reason.").max(1000) }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("notes"), adminNotes: z.string().max(5000) }),
  z.object({
    action: z.literal("verify"),
    decision: z.enum(["VERIFIED", "REJECTED"]),
    note: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("driver"),
    decision: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().trim().max(1000).optional(),
  }),
]);

// PATCH /api/admin/users/:id  { action: "role" | "suspend" | "unsuspend" | "notes" | "verify" | "driver", ... }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  // Older clients send just { role }.
  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw && !raw.action && raw.role ? { action: "role", ...raw } : raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const body = parsed.data;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      role: true,
      suspendedAt: true,
      verificationStatus: true,
      licenseImagePath: true,
      driverProfile: { select: { status: true, insuranceExpiresAt: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Stops an admin from locking themselves (and possibly everyone) out of the admin portal.
  if (id === admin.id && (body.action === "role" || body.action === "suspend")) {
    return NextResponse.json({ error: "You can't change your own role or suspend yourself." }, { status: 400 });
  }

  switch (body.action) {
    case "role":
      await prisma.user.update({ where: { id }, data: { role: body.role } });
      await logAudit(admin.id, "user.role", "USER", id, { from: user.role, to: body.role });
      break;

    case "suspend":
      if (user.suspendedAt) return NextResponse.json({ error: "This user is already suspended." }, { status: 409 });
      await prisma.user.update({ where: { id }, data: { suspendedAt: new Date(), suspensionReason: body.reason } });
      await logAudit(admin.id, "user.suspend", "USER", id, { reason: body.reason });
      break;

    case "driver": {
      const profile = user.driverProfile;
      if (!profile) return NextResponse.json({ error: "This user hasn't applied to drive." }, { status: 404 });
      if (body.decision === "APPROVED") {
        if (user.verificationStatus !== "VERIFIED") {
          return NextResponse.json({ error: "Verify their driver's licence first." }, { status: 409 });
        }
        if (profile.insuranceExpiresAt < new Date()) {
          return NextResponse.json({ error: "Their insurance has expired." }, { status: 409 });
        }
      } else if (!body.note) {
        return NextResponse.json({ error: "Please give a reason. The driver will see it." }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.driverProfile.update({
          where: { userId: id },
          data: { status: body.decision, reviewNote: body.decision === "REJECTED" ? body.note : null, reviewedAt: new Date() },
        }),
        // Renters become drivers so their navigation shows Dispatch. Hosts and admins keep their role.
        ...(body.decision === "APPROVED" && user.role === "RENTER" ? [prisma.user.update({ where: { id }, data: { role: "DRIVER" } })] : []),
      ]);
      await logAudit(admin.id, body.decision === "APPROVED" ? "driver.approve" : "driver.reject", "USER", id, {
        from: profile.status,
        note: body.note || null,
      });
      break;
    }

    case "unsuspend":
      await prisma.user.update({ where: { id }, data: { suspendedAt: null, suspensionReason: null } });
      await logAudit(admin.id, "user.unsuspend", "USER", id);
      break;

    case "notes":
      await prisma.user.update({ where: { id }, data: { adminNotes: body.adminNotes.trim() || null } });
      await logAudit(admin.id, "user.notes", "USER", id);
      break;

    case "verify":
      if (!user.licenseImagePath) {
        return NextResponse.json({ error: "This user hasn't uploaded a licence." }, { status: 409 });
      }
      if (body.decision === "REJECTED" && !body.note) {
        return NextResponse.json({ error: "Please tell the user why their licence was rejected." }, { status: 400 });
      }
      await prisma.user.update({
        where: { id },
        data: {
          verificationStatus: body.decision,
          verificationNote: body.decision === "REJECTED" ? body.note : null,
          verifiedAt: body.decision === "VERIFIED" ? new Date() : null,
        },
      });
      await logAudit(admin.id, body.decision === "VERIFIED" ? "user.verify" : "user.verify_reject", "USER", id, body.note ? { note: body.note } : undefined);
      break;
  }

  return NextResponse.json({ success: true });
}
