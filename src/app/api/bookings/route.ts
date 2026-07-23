import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { differenceInCalendarDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

const bookingSchema = z.object({
  listingId: z.string(),
  startDate: z.string(),
  endDate: z.string()
});

// GET /api/bookings - bookings for the signed-in renter
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: { renterId: (session.user as any).id },
    include: { listing: true, payment: true, review: true },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(
    bookings.map((b) => ({ ...b, totalPrice: Number(b.totalPrice) }))
  );
}

// POST /api/bookings - create a pending booking (payment handled separately)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { listingId, startDate, endDate } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || !listing.isActive) {
    return NextResponse.json({ error: 'Listing not available.' }, { status: 404 });
  }

  if (listing.hostId === (session.user as any).id) {
    return NextResponse.json({ error: 'You cannot book your own listing.' }, { status: 400 });
  }

  // Check for overlapping bookings
  const overlap = await prisma.booking.findFirst({
    where: {
      listingId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }]
    }
  });

  if (overlap) {
    return NextResponse.json({ error: 'This vehicle is already booked for part of that date range.' }, { status: 409 });
  }

  const days = Math.max(1, differenceInCalendarDays(end, start));
  const totalPrice = days * Number(listing.pricePerDay);

  const booking = await prisma.booking.create({
    data: {
      listingId,
      renterId: (session.user as any).id,
      startDate: start,
      endDate: end,
      totalPrice,
      status: 'PENDING'
    }
  });

  return NextResponse.json({ ...booking, totalPrice: Number(booking.totalPrice) }, { status: 201 });
}
