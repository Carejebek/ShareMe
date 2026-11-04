import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { syncRideRefundTotal } from "@/lib/ridePayments";
import { stripe } from "@/lib/stripe";

const schema = z.object({
  amount: z.number({ invalid_type_error: "Enter an amount." }).positive("Enter an amount.").multipleOf(0.01),
  reason: z.string().trim().min(1, "Please give a reason.").max(1000),
});

// POST /api/admin/rides/:id/refund  { amount, reason }
// Sends a full or partial refund of a charged ride fare through Stripe, then records it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  if (ride.paymentStatus !== "CAPTURED" || !ride.stripePaymentIntentId) {
    return NextResponse.json(
      { error: "Only charged rides can be refunded. For a ride that's still on hold, adjust the fare or cancel it instead." },
      { status: 409 }
    );
  }

  const refundable = Number(ride.totalPrice) - Number(ride.refundedAmount);
  const cents = Math.round(amount * 100);
  if (cents > Math.round(refundable * 100)) {
    return NextResponse.json({ error: `At most $${refundable.toFixed(2)} can still be refunded.` }, { status: 400 });
  }

  // The same key for the same refund means a double-click or retry can't refund twice.
  const idempotencyKey = `ride-refund-${ride.id}-${Math.round(Number(ride.refundedAmount) * 100)}-${cents}`;

  let stripeRefund;
  try {
    stripeRefund = await stripe.refunds.create(
      { payment_intent: ride.stripePaymentIntentId, amount: cents, metadata: { rideId: ride.id, adminId: admin.id } },
      { idempotencyKey }
    );
  } catch (e) {
    console.error("Stripe ride refund failed:", e);
    return NextResponse.json({ error: `Stripe refused the refund: ${(e as Error).message}` }, { status: 502 });
  }

  // Stripe's running total is the source of truth (the webhook writes the same value).
  let totalRefunded = Number(ride.refundedAmount) + cents / 100;
  try {
    const chargeId = typeof stripeRefund.charge === "string" ? stripeRefund.charge : stripeRefund.charge?.id;
    if (chargeId) totalRefunded = (await stripe.charges.retrieve(chargeId)).amount_refunded / 100;
  } catch (e) {
    console.error("Could not read refunded total from Stripe; adding this refund instead.", e);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rideRefund.create({
        data: { rideId: ride.id, stripeRefundId: stripeRefund.id, amount: cents / 100, reason, adminId: admin.id },
      });
      await syncRideRefundTotal(tx, ride.id, totalRefunded);
    });
  } catch (e) {
    // Already recorded (a retry that Stripe answered with the same refund).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ success: true, duplicate: true });
    }
    throw e;
  }

  await logAudit(admin.id, "ride.refund", "RIDE", ride.id, {
    amount: cents / 100,
    reason,
    stripeRefundId: stripeRefund.id,
    driverAlreadyPaid: Boolean(ride.payoutId),
  });

  return NextResponse.json({ success: true, driverAlreadyPaid: Boolean(ride.payoutId) });
}
