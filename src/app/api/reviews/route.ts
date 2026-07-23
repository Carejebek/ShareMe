import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

const reviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional()
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { bookingId, rating, comment } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { listing: true, review: true }
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  const userId = (session.user as any).id;
  if (booking.renterId !== userId) {
    return NextResponse.json({ error: 'Only the renter can leave a review.' }, { status: 403 });
  }
  if (booking.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'You can only review completed bookings.' }, { status: 400 });
  }
  if (booking.review) {
    return NextResponse.json({ error: 'You already reviewed this booking.' }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      bookingId,
      listingId: booking.listingId,
      authorId: userId,
      targetId: booking.listing.hostId,
      rating,
      comment
    }
  });

  return NextResponse.json(review, { status: 201 });
}
