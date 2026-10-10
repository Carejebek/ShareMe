import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/rides";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  bookingId: z.string().min(1),
  type: z.enum(["DAMAGE", "CLEANING", "LATE_RETURN", "FUEL", "TOLLS_TICKETS", "OTHER"]),
  description: z.string().trim().min(10, "Please describe what happened (at least 10 characters).").max(5000),
  amountRequested: z.number().min(0).max(100000).multipleOf(0.01).nullable().optional(),
  imageUrls: z.array(z.string().regex(/^\/uploads\/vehicles\/[\w.-]+$/, "Invalid photo.")).max(8).default([]),
});

// POST /api/claims — the renter or host of a booking reports a problem with the trip
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!rateLimit(`claim:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many claims. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const data = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    select: { renterId: true, status: true, listing: { select: { hostId: true } } },
  });
  if (!booking || (booking.renterId !== user.id && booking.listing.hostId !== user.id)) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "Issues can only be reported for confirmed or completed trips." }, { status: 409 });
  }

  const claim = await prisma.claim.create({
    data: {
      bookingId: data.bookingId,
      reporterId: user.id,
      type: data.type,
      description: data.description,
      amountRequested: data.amountRequested ?? null,
      imageUrls: data.imageUrls,
    },
  });
  return NextResponse.json({ success: true, id: claim.id });
}
