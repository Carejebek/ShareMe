import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/reviews/:id — remove an abusive or fake review
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const result = await prisma.review.deleteMany({ where: { id } });
  if (result.count === 0) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}
