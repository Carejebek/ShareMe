import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { canSeeListing } from '@/lib/listingVisibility';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, avatarUrl: true, createdAt: true, suspendedAt: true } },
      reviews: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  // Cars that aren't live are only visible to their host and admins.
  if (!listing || !(await canSeeListing(listing))) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  const { suspendedAt: _hidden, ...host } = listing.host;
  return NextResponse.json({ ...listing, host, pricePerDay: Number(listing.pricePerDay) });
}

const hostEditSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(5000),
    make: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(60),
    year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
    pricePerDay: z.number().positive().max(100000),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    seats: z.number().int().min(1).max(15),
    transmission: z.enum(['AUTOMATIC', 'MANUAL']),
    fuelType: z.enum(['GASOLINE', 'HYBRID', 'ELECTRIC', 'DIESEL']),
    category: z.enum(['ECONOMY', 'SEDAN', 'SUV', 'LUXURY', 'SPORTS', 'VAN', 'TRUCK']).nullable(),
    imageUrls: z.array(z.string().url()).max(12),
    isActive: z.boolean()
  })
  .partial()
  .strict();

const REVIEWED_FIELDS = ['title', 'description', 'make', 'model', 'year', 'imageUrls'] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }
  if (listing.hostId !== (session.user as any).id) {
    return NextResponse.json({ error: 'You do not own this listing.' }, { status: 403 });
  }

  // Hosts may only change these fields. Approval, notes and ownership are admin-only.
  const parsed = hostEditSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid changes.' }, { status: 400 });
  }
  const changes = parsed.data;
  // Changing what the car is (or its photos) sends an approved listing back for review.
  const needsReview = REVIEWED_FIELDS.some((field) => field in changes) && listing.approvalStatus === 'APPROVED';

  const updated = await prisma.listing.update({
    where: { id },
    data: { ...changes, ...(needsReview ? { approvalStatus: 'PENDING', rejectionReason: null } : {}) }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }
  if (listing.hostId !== (session.user as any).id) {
    return NextResponse.json({ error: 'You do not own this listing.' }, { status: 403 });
  }

  await prisma.listing.update({ where: { id }, data: { isActive: false } });

  return NextResponse.json({ success: true });
}
