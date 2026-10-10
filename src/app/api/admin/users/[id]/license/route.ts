import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { readPrivateFile } from "@/lib/privateFiles";

// GET /api/admin/users/:id/license — the user's driver's licence photo (admins only)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { licenseImagePath: true } });
  if (!user?.licenseImagePath) return NextResponse.json({ error: "No licence uploaded." }, { status: 404 });

  try {
    const file = await readPrivateFile(user.licenseImagePath);
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.contentType,
        // Never let browsers or proxies keep a copy of an ID document.
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Licence file is missing." }, { status: 404 });
  }
}
