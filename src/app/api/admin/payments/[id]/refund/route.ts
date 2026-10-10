import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const schema = z.object({
  amount: z.number().positive().multipleOf(0.01),
  reason: z.string().trim().min(1, "Please give a reason.").max(1000),
  cancelBooking: z.boolean().default(false),
});

// POST /api/admin/payments/:id/refund  { amount, reason, cancelBooking }
// Sends a full or partial refund through Stripe, then records it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { amount, reason, cancelBooking } = parsed.data;

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { booking: { select: { id: true, status: true, payoutId: true } } },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.status !== "SUCCEEDED") {
    return NextResponse.json({ error: "Only successful payments that aren't fully refunded can be refunded." }, { status: 409 });
  }

  const refundable = Number(payment.amount) - Number(payment.refundedAmount);
  const cents = Math.round(amount * 100);
  if (cents > Math.round(refundable * 100)) {
    return NextResponse.json({ error: `At most $${refundable.toFixed(2)} can still be refunded.` }, { status: 400 });
  }

  // The same key for the same refund means a double-click or retry can't refund twice.
  const idempotencyKey = `refund-${payment.id}-${Math.round(Number(payment.refundedAmount) * 100)}-${cents}`;

  let stripeRefund;
  try {
    stripeRefund = await stripe.refunds.create(
      { payment_intent: payment.stripePaymentIntentId, amount: cents, metadata: { paymentId: payment.id, adminId: admin.id } },
      { idempotencyKey }
    );
  } catch (e) {
    console.error("Stripe refund failed:", e);
    return NextResponse.json({ error: `Stripe refused the refund: ${(e as Error).message}` }, { status: 502 });
  }

  // Stripe's own running total is the source of truth (the webhook writes the same value),
  // so concurrent refunds or a webhook arriving first can't make the total drift.
  let stripeTotalRefunded: number | null = null;
  try {
    const chargeId = typeof stripeRefund.charge === "string" ? stripeRefund.charge : stripeRefund.charge?.id;
    if (chargeId) stripeTotalRefunded = (await stripe.charges.retrieve(chargeId)).amount_refunded / 100;
  } catch (e) {
    console.error("Could not read refunded total from Stripe; adding this refund instead.", e);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.refund.create({
        data: { paymentId: payment.id, stripeRefundId: stripeRefund.id, amount: cents / 100, reason, adminId: admin.id },
      });
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmount: stripeTotalRefunded !== null ? stripeTotalRefunded : { increment: cents / 100 },
        },
      });
      if (Number(updated.refundedAmount) >= Number(updated.amount)) {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
      }
      if (cancelBooking && (payment.booking.status === "PENDING" || payment.booking.status === "CONFIRMED")) {
        await tx.booking.update({ where: { id: payment.booking.id }, data: { status: "CANCELLED" } });
      }
    });
  } catch (e) {
    // Already recorded (a retry that Stripe answered with the same refund) — nothing more to do.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ success: true, duplicate: true });
    }
    throw e;
  }

  await logAudit(admin.id, "payment.refund", "PAYMENT", payment.id, {
    amount: cents / 100,
    reason,
    stripeRefundId: stripeRefund.id,
    bookingCancelled: cancelBooking,
    hostAlreadyPaid: Boolean(payment.booking.payoutId),
  });

  return NextResponse.json({ success: true, hostAlreadyPaid: Boolean(payment.booking.payoutId) });
}
