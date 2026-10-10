import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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

  const body = await req.json();
  const updated = await prisma.listing.update({
    where: { id },
    data: body
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
