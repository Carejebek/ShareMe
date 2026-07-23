import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/listings?city=&startDate=&endDate=&minPrice=&maxPrice=&seats=&mine=true
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || undefined;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const seats = searchParams.get('seats');
  const mine = searchParams.get('mine');

  const where: any = {};

  if (mine === 'true') {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
    }
    where.hostId = (session.user as any).id;
  } else {
    where.isActive = true;
  }

  if (city) {
    where.city = { equals: city, mode: 'insensitive' };
  }
  if (minPrice || maxPrice) {
    where.pricePerDay = {};
    if (minPrice) where.pricePerDay.gte = parseFloat(minPrice);
    if (maxPrice) where.pricePerDay.lte = parseFloat(maxPrice);
  }
  if (seats) {
    where.seats = { gte: parseInt(seats, 10) };
  }

  // Exclude listings that have an overlapping CONFIRMED/PENDING booking in the requested range
  if (startDate && endDate) {
    where.bookings = {
      none: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [
          { startDate: { lt: new Date(endDate) } },
          { endDate: { gt: new Date(startDate) } }
        ]
      }
    };
  }

  const listings = await prisma.listing.findMany({
    where,
    include: {
      reviews: { select: { rating: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const result = listings.map((l) => {
    const ratings = l.reviews.map((r) => r.rating);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined;
    const { reviews, ...rest } = l;
    return { ...rest, pricePerDay: Number(l.pricePerDay), avgRating };
  });

  return NextResponse.json(result);
}

const listingSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  pricePerDay: z.number().positive(),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().default('US'),
  seats: z.number().int().min(1).max(15).default(4),
  transmission: z.enum(['AUTOMATIC', 'MANUAL']).default('AUTOMATIC'),
  fuelType: z.enum(['GASOLINE', 'HYBRID', 'ELECTRIC', 'DIESEL']).default('GASOLINE'),
  imageUrls: z.array(z.string().url()).default([])
});

// POST /api/listings - create a new listing (host only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const listing = await prisma.listing.create({
    data: {
      ...parsed.data,
      hostId: (session.user as any).id
    }
  });

  return NextResponse.json(listing, { status: 201 });
}
