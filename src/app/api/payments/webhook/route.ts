import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { notifyBookingStatus } from '@/lib/notifications';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: intent.id }
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED' }
      });
      // Stripe can deliver the same event more than once; only text people the first time.
      const confirmed = await prisma.booking.updateMany({
        where: { id: payment.bookingId, status: { not: 'CONFIRMED' } },
        data: { status: 'CONFIRMED' }
      });
      if (confirmed.count > 0) notifyBookingStatus(payment.bookingId, 'CONFIRMED');
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: intent.id }
    });
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' }
      });
    }
  }

  // Keeps refund totals right when a refund is made directly in the Stripe dashboard.
  // Stripe is the source of truth, so the total is copied rather than added to.
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (intentId) {
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intentId },
        data: {
          refundedAmount: charge.amount_refunded / 100,
          ...(charge.refunded ? { status: 'REFUNDED' } : {})
        }
      });
    }
  }

  return NextResponse.json({ received: true });
}
