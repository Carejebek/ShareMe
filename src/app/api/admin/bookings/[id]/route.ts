import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { BOOKING_TRANSITIONS } from "@/lib/adminRules";
import { prisma } from "@/lib/prisma";

const schema = z.object({ status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]) });

// PATCH /api/admin/bookings/:id  { status } — confirm, complete or cancel a booking.
// Cancelling does not refund the renter; refunds are handled in Stripe.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id }, select: { status: true } });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const next = parsed.data.status;
  if (!BOOKING_TRANSITIONS[booking.status].includes(next)) {
    return NextResponse.json(
      { error: `A ${booking.status.toLowerCase()} booking can't be changed to ${next.toLowerCase()}.` },
      { status: 409 }
    );
  }

  // Only update if the status hasn't changed since we read it.
  const result = await prisma.booking.updateMany({ where: { id, status: booking.status }, data: { status: next } });
  if (result.count === 0) {
    return NextResponse.json({ error: "This booking was just changed by someone else. Refresh and try again." }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
