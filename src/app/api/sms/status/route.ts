import { NextRequest, NextResponse } from 'next/server';
import { getTwilioConfig } from '@/lib/integrations';
import { prisma } from '@/lib/prisma';
import { validTwilioSignature } from '@/lib/sms';

// POST /api/sms/status — Twilio delivery status callback (set automatically on each message we send).
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });

  // Twilio signs the public URL it called, not the internal one this server sees behind the proxy.
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const config = await getTwilioConfig();
  if (!validTwilioSignature(config.authToken, `${base}/api/sms/status`, params, req.headers.get('x-twilio-signature'))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 403 });
  }

  const sid = params.MessageSid;
  const status = params.MessageStatus;
  if (sid && status) {
    // Callbacks can arrive out of order; never replace a final status with an earlier one.
    const final = ['delivered', 'undelivered', 'failed', 'read'];
    await prisma.smsMessage.updateMany({
      where: { twilioSid: sid, ...(final.includes(status) ? {} : { status: { notIn: final } }) },
      data: {
        status,
        error: params.ErrorCode ? `Twilio error ${params.ErrorCode}` : status === 'delivered' || status === 'read' ? null : undefined
      }
    });
  }
  return new NextResponse(null, { status: 204 });
}
