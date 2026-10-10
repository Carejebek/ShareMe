import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/rides";
import { prisma } from "@/lib/prisma";
import { savePrivateImage } from "@/lib/privateFiles";
import { rateLimit } from "@/lib/rateLimit";

// POST /api/account/verification  (multipart: license=<image>) — submit a driver's licence for review
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!rateLimit(`licence:${user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many uploads. Try again in an hour." }, { status: 429 });
  }

  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { verificationStatus: true } });
  if (current?.verificationStatus === "VERIFIED") {
    return NextResponse.json({ error: "Your licence is already verified." }, { status: 409 });
  }

  const file = (await req.formData().catch(() => null))?.get("license");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a photo of your driver's licence." }, { status: 400 });
  }

  let licenseImagePath: string;
  try {
    licenseImagePath = await savePrivateImage("licenses", file, 10 * 1024 * 1024);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { licenseImagePath, verificationStatus: "PENDING", verificationNote: null },
  });
  return NextResponse.json({ success: true });
}
