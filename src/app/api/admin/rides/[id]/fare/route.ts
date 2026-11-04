import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const schema = z.object({
  amount: z.number({ invalid_type_error: "Enter the new fare." }).min(0.5, "The fare must be at least 0.50.").multipleOf(0.01),
  reason: z.string().trim().min(1, "Please give a reason.").max(1000),
});

// PATCH /api/admin/rides/:id/fare  { amount, reason }
// Changes what the rider will be charged while the card is still on hold (e.g. the driver took a longer
// route, or a goodwill discount). It can't go above the hold; once charged, use a refund instead.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { amount, reason } = parsed.data;

  const { id } = await params;
  const ride = await prisma.ride.findUnique({ where: { id } });
  if (!ride) return NextResponse.json({ error: "Ride not found." }, { status: 404 });
  if (ride.paymentStatus !== "AUTHORIZED" || !ride.stripePaymentIntentId || ride.status === "CANCELLED") {
    return NextResponse.json(
      { error: ride.paymentStatus === "CAPTURED" ? "This fare was already charged. Use a refund instead." : "This ride has no card hold to adjust." },
      { status: 409 }
    );
  }

  let held: number;
  try {
    const intent = await stripe.paymentIntents.retrieve(ride.stripePaymentIntentId);
    if (intent.status !== "requires_capture") {
      return NextResponse.json({ error: "Stripe no longer has a hold on this card." }, { status: 409 });
    }
    held = intent.amount_capturable / 100;
  } catch (e) {
    console.error("Reading ride hold failed:", e);
    return NextResponse.json({ error: `Couldn't check the card hold with Stripe: ${(e as Error).message}` }, { status: 502 });
  }
  if (amount > held) {
    return NextResponse.json(
      { error: `The card is only held for $${held.toFixed(2)}, so the fare can't be higher than that.` },
      { status: 400 }
    );
  }

  const before = Number(ride.totalPrice);
  // Conditional so it can't race the trip being completed (and charged) at the same moment.
  const updated = await prisma.ride.updateMany({
    where: { id, paymentStatus: "AUTHORIZED", status: { not: "CANCELLED" } },
    data: { totalPrice: amount },
  });
  if (updated.count === 0) return NextResponse.json({ error: "This ride was just updated. Refresh and try again." }, { status: 409 });

  await logAudit(admin.id, "ride.fare", "RIDE", ride.id, { from: before, to: amount, held, reason });
  return NextResponse.json({ success: true });
}
