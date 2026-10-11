import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTwilioConfig } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getSessionUser } from "@/lib/rides";
import { toE164 } from "@/lib/sms";

const schema = z.object({ phone: z.string().trim().max(30) });

// PATCH /api/account/phone  { phone } — the number used for SMS updates. An empty value removes it.
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!rateLimit(`phone:${user.id}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many changes. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a phone number." }, { status: 400 });

  let phone: string | null = null;
  if (parsed.data.phone) {
    const { defaultCountryCode } = await getTwilioConfig();
    phone = toE164(parsed.data.phone, defaultCountryCode);
    if (!phone) {
      return NextResponse.json({ error: "That doesn't look like a valid mobile number. Include your country code, e.g. +1 555 123 4567." }, { status: 400 });
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { phone } });
  return NextResponse.json({ success: true, phone });
}
