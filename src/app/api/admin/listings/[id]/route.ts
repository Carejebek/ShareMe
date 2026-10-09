import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({ isActive: z.boolean() });

// PATCH /api/admin/listings/:id  { isActive } — take a listing offline or back online
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { id } = await params;
  const result = await prisma.listing.updateMany({ where: { id }, data: { isActive: parsed.data.isActive } });
  if (result.count === 0) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}
