import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getTwilioConfig } from '@/lib/integrations';
import { prisma } from '@/lib/prisma';
import { toE164 } from '@/lib/sms';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['RENTER', 'HOST']).default('RENTER'),
  phone: z.string().trim().max(30).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, password, role } = parsed.data;
    let phone: string | null = null;
    if (parsed.data.phone) {
      phone = toE164(parsed.data.phone, (await getTwilioConfig()).defaultCountryCode);
      if (!phone) {
        return NextResponse.json({ error: 'Please enter a valid mobile number, or leave it blank.' }, { status: 400 });
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, phone }
    });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
