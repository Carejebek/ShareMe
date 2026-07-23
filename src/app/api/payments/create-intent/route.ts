import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const { bookingId } = await req.json();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true }
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  if (booking.renterId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (booking.payment) {
    return NextResponse.json({ clientSecret: null, message: 'Payment already initiated.' });
  }

  const amountInCents = Math.round(Number(booking.totalPrice) * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    metadata: { bookingId: booking.id },
    automatic_payment_methods: { enabled: true }
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      stripePaymentIntentId: paymentIntent.id,
      amount: booking.totalPrice,
      status: 'PENDING'
    }
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
