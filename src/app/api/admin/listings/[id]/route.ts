import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const schema = z.union([
  z.object({ isActive: z.boolean() }),
  z.object({ adminNotes: z.string().max(5000) }),
]);

// PATCH /api/admin/listings/:id  { isActive } | { adminNotes }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { id } = await params;
  const data = parsed.data;
  const result = await prisma.listing.updateMany({
    where: { id },
    data: "isActive" in data ? { isActive: data.isActive } : { adminNotes: data.adminNotes.trim() || null },
  });
  if (result.count === 0) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

  await logAudit(
    admin.id,
    "isActive" in data ? (data.isActive ? "listing.activate" : "listing.deactivate") : "listing.notes",
    "LISTING",
    id
  );
  return NextResponse.json({ success: true });
}
