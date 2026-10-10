import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/reviews/:id — remove an abusive or fake review
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id }, select: { rating: true, comment: true, authorId: true, listingId: true } });
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  await prisma.review.delete({ where: { id } });
  // Keep a copy of what was removed, in case it's ever disputed.
  await logAudit(admin.id, "review.delete", "REVIEW", id, review);

  return NextResponse.json({ success: true });
}
