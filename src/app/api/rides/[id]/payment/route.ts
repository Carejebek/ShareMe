import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { confirmRideHold } from '@/lib/ridePayments';
import { getSessionUser } from '@/lib/rides';

// POST /api/rides/:id/payment — called by the browser after the card form succeeds.
// The hold is verified with Stripe before the ride is shown to drivers.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const ride = await prisma.ride.findUnique({ where: { id } });
  if (!ride || ride.riderId !== user.id) return NextResponse.json({ error: 'Ride not found.' }, { status: 404 });

  try {
    const result = await confirmRideHold(ride);
    if (!result.ok) {
      return NextResponse.json({ error: "We couldn't confirm the payment for this ride. Please try again." }, { status: 402 });
    }
    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    console.error('Confirming ride payment failed:', error);
    return NextResponse.json({ error: 'Could not check the payment. Please try again.' }, { status: 502 });
  }
}
