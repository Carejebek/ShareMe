import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTwilioConfig } from '@/lib/integrations';
import { prisma } from '@/lib/prisma';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { toE164 } from '@/lib/sms';

const waitlistSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(100),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.').max(200),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(100).optional(),
  interest: z.enum(['RIDE', 'RENT', 'DRIVE', 'HOST']).default('RIDE'),
  website: z.string().optional() // honeypot: real visitors never see or fill this
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`waitlist:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 });
  }

  try {
    const parsed = waitlistSchema.safeParse(await req.json());
    if (!parsed.success) {
      const message = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return NextResponse.json({ error: message || 'Please check your details.' }, { status: 400 });
    }

    const { name, email, interest, website } = parsed.data;
    // Bots fill every field; pretend it worked so they don't retry.
    if (website) return NextResponse.json({ ok: true }, { status: 201 });

    let phone: string | null = null;
    if (parsed.data.phone) {
      phone = toE164(parsed.data.phone, (await getTwilioConfig()).defaultCountryCode);
      if (!phone) {
        return NextResponse.json({ error: 'Please enter a valid mobile number, or leave it blank.' }, { status: 400 });
      }
    }
    const city = parsed.data.city || null;

    // Signing up twice just updates the details, and never reveals whether an email is already listed.
    await prisma.waitlistEntry.upsert({
      where: { email },
      create: { name, email, phone, city, interest },
      update: { name, phone, city, interest }
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
