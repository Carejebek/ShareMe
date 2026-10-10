import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionUser } from "@/lib/rides";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "The new password must be at least 8 characters.").max(200),
});

// POST /api/account/password  { currentPassword, newPassword }
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!rateLimit(`password:${user.id}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!account || !(await bcrypt.compare(parsed.data.currentPassword, account.passwordHash))) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  return NextResponse.json({ success: true });
}
