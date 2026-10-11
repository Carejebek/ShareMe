import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const schema = z.union([
  z.object({ isActive: z.boolean() }),
  z.object({ adminNotes: z.string().max(5000) }),
  z.object({ category: z.enum(["ECONOMY", "SEDAN", "SUV", "LUXURY", "SPORTS", "VAN", "TRUCK", "NONE"]) }),
]);

// PATCH /api/admin/listings/:id  { isActive } | { adminNotes } | { category }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { id } = await params;
  const data = parsed.data;
  const result = await prisma.listing.updateMany({
    where: { id },
    data:
      "isActive" in data
        ? { isActive: data.isActive }
        : "category" in data
          ? { category: data.category === "NONE" ? null : data.category }
          : { adminNotes: data.adminNotes.trim() || null },
  });
  if (result.count === 0) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

  await logAudit(
    admin.id,
    "isActive" in data ? (data.isActive ? "listing.activate" : "listing.deactivate") : "category" in data ? "listing.category" : "listing.notes",
    "LISTING",
    id,
    "category" in data ? { category: data.category } : undefined
  );
  return NextResponse.json({ success: true });
}
