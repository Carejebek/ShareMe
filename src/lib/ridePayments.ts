import type { Prisma, Ride } from "@prisma/client";
import { notifyNewRideRequest } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getPlatformFeePercent, splitEarnings } from "@/lib/settings";
import { stripe } from "@/lib/stripe";

// Ride fares are paid by card. Booking places a hold (manual capture) for the locked-in fare,
// completing the trip charges it, and cancelling or expiring the request releases it.
// Stripe keeps card holds for about 7 days, so scheduled rides are limited to 6 days ahead.
export const MAX_SCHEDULE_DAYS = 6;

export async function createRideHold(ride: Pick<Ride, "id" | "riderId" | "totalPrice" | "currency">) {
  const intent = await stripe.paymentIntents.create(
    {
      amount: Math.round(Number(ride.totalPrice) * 100),
      currency: ride.currency.toLowerCase(),
      capture_method: "manual",
      payment_method_types: ["card"],
      metadata: { rideId: ride.id, riderId: ride.riderId },
      description: `JayXZ ride ${ride.id}`,
    },
    { idempotencyKey: `ride-hold-${ride.id}` }
  );
  await prisma.ride.update({ where: { id: ride.id }, data: { stripePaymentIntentId: intent.id } });
  return intent;
}

// Called when Stripe says the hold succeeded (from the browser after checkout, and from the webhook).
// The status check makes it safe to run twice: drivers are only alerted once.
export async function markRideAuthorized(rideId: string, paymentIntentId: string) {
  const result = await prisma.ride.updateMany({
    where: { id: rideId, stripePaymentIntentId: paymentIntentId, status: "AWAITING_PAYMENT" },
    data: { status: "REQUESTED", paymentStatus: "AUTHORIZED", requestedAt: new Date() },
  });
  if (result.count === 1) notifyNewRideRequest(rideId);
  return result.count === 1;
}

// Checks the hold with Stripe rather than trusting the browser.
export async function confirmRideHold(ride: Pick<Ride, "id" | "status" | "stripePaymentIntentId">) {
  if (ride.status !== "AWAITING_PAYMENT") return { ok: ride.status !== "CANCELLED", status: ride.status };
  if (!ride.stripePaymentIntentId) return { ok: false, status: ride.status };
  const intent = await stripe.paymentIntents.retrieve(ride.stripePaymentIntentId);
  if (intent.status !== "requires_capture" || intent.metadata.rideId !== ride.id) return { ok: false, status: ride.status };
  await markRideAuthorized(ride.id, intent.id);
  return { ok: true, status: "REQUESTED" };
}

// Charges the held fare when the trip is completed and locks in the platform fee / driver share.
export async function captureRideFare(rideId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride?.stripePaymentIntentId || ride.paymentStatus !== "AUTHORIZED") return { ok: false, error: "No card hold to charge." };
  try {
    // totalPrice can be lower than the hold if an admin adjusted the fare; Stripe releases the rest.
    const intent = await stripe.paymentIntents.capture(
      ride.stripePaymentIntentId,
      { amount_to_capture: Math.round(Number(ride.totalPrice) * 100) },
      { idempotencyKey: `ride-capture-${ride.id}` }
    );
    const charged = intent.amount_received / 100;
    const split = splitEarnings(charged, await getPlatformFeePercent());
    await prisma.ride.update({
      where: { id: ride.id },
      data: { paymentStatus: "CAPTURED", paid: true, platformFee: split.platformFee, driverEarnings: split.hostEarnings },
    });
    return { ok: true, error: "" };
  } catch (error) {
    console.error("Ride capture failed:", rideId, error);
    await prisma.ride.update({ where: { id: ride.id }, data: { paymentStatus: "FAILED" } });
    return { ok: false, error: (error as Error).message };
  }
}

// Releases the hold (ride cancelled or no driver found). Never throws.
export async function releaseRideHold(ride: Pick<Ride, "id" | "stripePaymentIntentId" | "paymentStatus">) {
  if (!ride.stripePaymentIntentId || ride.paymentStatus === "CAPTURED" || ride.paymentStatus === "RELEASED") return;
  try {
    const intent = await stripe.paymentIntents.retrieve(ride.stripePaymentIntentId);
    if (!["succeeded", "canceled"].includes(intent.status)) {
      await stripe.paymentIntents.cancel(ride.stripePaymentIntentId, {}, { idempotencyKey: `ride-release-${ride.id}` });
    }
    await prisma.ride.update({ where: { id: ride.id }, data: { paymentStatus: "RELEASED" } });
  } catch (error) {
    console.error("Releasing ride hold failed:", ride.id, error);
  }
}

// Records Stripe's running refund total for a ride (Stripe is the source of truth, so it's copied, not added).
// If the driver hasn't been paid out yet, their share and the platform fee shrink in proportion,
// keeping the fee percentage that was locked in at capture.
export async function syncRideRefundTotal(
  db: Prisma.TransactionClient | typeof prisma,
  rideId: string,
  totalRefunded: number
) {
  const ride = await db.ride.findUnique({ where: { id: rideId } });
  if (!ride) return null;
  const charged = Number(ride.totalPrice);
  const refunded = Math.min(Math.round(totalRefunded * 100) / 100, charged);
  const data: Prisma.RideUpdateInput = { refundedAmount: refunded };
  if (!ride.payoutId && ride.platformFee !== null && charged > 0) {
    const net = Math.round((charged - refunded) * 100) / 100;
    // The fee's share of the fare, locked in at capture. Earlier partial refunds keep the same ratio.
    const fee = Number(ride.platformFee);
    const split = fee + Number(ride.driverEarnings ?? 0);
    const share = split > 0 ? fee / split : 0;
    const platformFee = Math.round(net * share * 100) / 100;
    data.platformFee = platformFee;
    data.driverEarnings = Math.round((net - platformFee) * 100) / 100;
  }
  return db.ride.update({ where: { id: rideId }, data });
}
