import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditTarget = "USER" | "LISTING" | "BOOKING" | "PAYMENT" | "PAYOUT" | "CLAIM" | "REVIEW" | "RIDE" | "SETTING";

// Records an admin action. Never throws: a failed log write shouldn't undo the action itself.
export async function logAudit(
  adminId: string,
  action: string,
  targetType: AuditTarget,
  targetId: string,
  details?: Prisma.InputJsonValue
) {
  try {
    await prisma.auditLog.create({ data: { adminId, action, targetType, targetId, details } });
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}

export const AUDIT_LABELS: Record<string, string> = {
  "listing.approve": "Approved vehicle",
  "listing.reject": "Rejected vehicle",
  "listing.pending": "Moved vehicle back to pending",
  "listing.activate": "Reactivated vehicle",
  "listing.deactivate": "Deactivated vehicle",
  "listing.notes": "Updated vehicle notes",
  "booking.status": "Changed booking status",
  "user.role": "Changed role",
  "user.suspend": "Suspended user",
  "user.unsuspend": "Unsuspended user",
  "user.notes": "Updated user notes",
  "user.verify": "Verified licence",
  "user.verify_reject": "Rejected licence",
  "payment.refund": "Issued refund",
  "payout.create": "Recorded host payout",
  "claim.update": "Updated claim",
  "review.delete": "Deleted review",
  "setting.update": "Changed setting",
};
