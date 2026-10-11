import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { savePrivateImage } from "@/lib/privateFiles";
import { rateLimit } from "@/lib/rateLimit";
import { getSessionUser } from "@/lib/rides";

const thisYear = new Date().getFullYear();
const schema = z.object({
  vehicleMake: z.string().trim().min(1, "Enter the car's make.").max(40),
  vehicleModel: z.string().trim().min(1, "Enter the car's model.").max(40),
  vehicleYear: z.coerce.number().int().min(thisYear - 25, "The car must be no more than 25 years old.").max(thisYear + 1),
  vehicleColor: z.string().trim().min(2, "Enter the car's colour.").max(30),
  vehiclePlate: z.string().trim().toUpperCase().regex(/^[A-Z0-9 -]{2,12}$/, "Enter the licence plate (letters and numbers)."),
  insuranceExpiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter when your insurance expires."),
});

// POST /api/account/driver (multipart) — apply to drive, or update vehicle/insurance details.
// Any change sends the application back for admin review.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!rateLimit(`driver-apply:${user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many submissions. Try again in an hour." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form." }, { status: 400 });
  const parsed = schema.safeParse(Object.fromEntries(["vehicleMake", "vehicleModel", "vehicleYear", "vehicleColor", "vehiclePlate", "insuranceExpiresAt"].map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });

  const expires = new Date(`${parsed.data.insuranceExpiresAt}T23:59:59`);
  if (Number.isNaN(expires.getTime()) || expires < new Date()) {
    return NextResponse.json({ error: "Your insurance must not be expired." }, { status: 400 });
  }

  const existing = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
  const file = form.get("insurance");
  let insuranceImagePath = existing?.insuranceImagePath;
  if (file instanceof File && file.size > 0) {
    try {
      insuranceImagePath = await savePrivateImage("insurance", file, 10 * 1024 * 1024);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }
  if (!insuranceImagePath) return NextResponse.json({ error: "Please upload a photo of your insurance card or certificate." }, { status: 400 });

  const data = {
    ...parsed.data,
    insuranceExpiresAt: expires,
    insuranceImagePath,
    status: "PENDING" as const,
    reviewNote: null,
    reviewedAt: null,
    submittedAt: new Date(),
  };
  await prisma.driverProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  return NextResponse.json({ success: true });
}
