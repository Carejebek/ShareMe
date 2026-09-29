import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { listing: true, payment: true, renter: { select: { id: true, name: true, email: true } } }
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  const userId = (session.user as any).id;
  if (booking.renterId !== userId && booking.listing.hostId !== userId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  return NextResponse.json({ ...booking, totalPrice: Number(booking.totalPrice) });
}

// PATCH - cancel a booking (renter) or confirm/complete (host)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { listing: true }
  });
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  const userId = (session.user as any).id;
  const { status } = await req.json();

  const isRenter = booking.renterId === userId;
  const isHost = booking.listing.hostId === userId;

  if (!isRenter && !isHost) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const allowedForRenter = ['CANCELLED'];
  const allowedForHost = ['CONFIRMED', 'CANCELLED', 'COMPLETED'];

  if (isRenter && !allowedForRenter.includes(status)) {
    return NextResponse.json({ error: 'Renters may only cancel a booking.' }, { status: 403 });
  }
  if (isHost && !allowedForHost.includes(status)) {
    return NextResponse.json({ error: 'Invalid status update.' }, { status: 400 });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status }
  });

  return NextResponse.json({ ...updated, totalPrice: Number(updated.totalPrice) });
}
