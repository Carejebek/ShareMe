import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({ role: z.enum(["RENTER", "HOST", "DRIVER", "ADMIN"]) });

// PATCH /api/admin/users/:id  { role }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  const { id } = await params;
  // Stops an admin from locking themselves (and possibly everyone) out of the admin portal.
  if (id === admin.id) {
    return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
  }

  const result = await prisma.user.updateMany({ where: { id }, data: { role: parsed.data.role } });
  if (result.count === 0) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}
