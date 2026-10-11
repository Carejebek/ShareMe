import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { readPrivateFile } from "@/lib/privateFiles";

// GET /api/admin/users/:id/insurance — the driver's insurance document (admins only)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const user = await prisma.driverProfile.findUnique({ where: { userId: id }, select: { insuranceImagePath: true } });
  if (!user?.insuranceImagePath) return NextResponse.json({ error: "No insurance uploaded." }, { status: 404 });

  try {
    const file = await readPrivateFile(user.insuranceImagePath);
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.contentType,
        // Never let browsers or proxies keep a copy of an insurance document.
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Insurance file is missing." }, { status: 404 });
  }
}
