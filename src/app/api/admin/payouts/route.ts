import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { UNPAID_EARNINGS_WHERE, UNPAID_RIDES_WHERE } from "@/lib/payouts";
import { getPlatformFeePercent, splitEarnings } from "@/lib/settings";

const schema = z.object({
  hostId: z.string().min(1),
  bookingIds: z.array(z.string().min(1)).default([]),
  rideIds: z.array(z.string().min(1)).default([]),
  method: z.string().trim().min(1, "Say how the host was paid.").max(100),
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
});

// POST /api/admin/payouts — record that a host or driver has been paid (outside the app) for some
// bookings and/or rides. hostId is whoever was paid. The fee rate in effect right now is locked into
// each booking; rides already had their fee locked in when the fare was charged.
export async function POST(req: NextRequest) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { hostId, bookingIds, rideIds, method, reference, note } = parsed.data;
  if (bookingIds.length + rideIds.length === 0) {
    return NextResponse.json({ error: "Nothing to pay out." }, { status: 400 });
  }
  const feePercent = await getPlatformFeePercent();

  try {
    const payout = await prisma.$transaction(async (tx) => {
      const bookings = await tx.booking.findMany({
        where: { ...UNPAID_EARNINGS_WHERE, id: { in: bookingIds }, listing: { hostId } },
        select: { id: true, payment: { select: { amount: true, refundedAmount: true } } },
      });
      if (bookings.length !== bookingIds.length) {
        throw new Error("Some of these bookings are no longer unpaid. Refresh and try again.");
      }

      const splits = bookings.map((b) => ({
        id: b.id,
        ...splitEarnings(Number(b.payment!.amount) - Number(b.payment!.refundedAmount), feePercent),
      }));
      const rides = await tx.ride.findMany({
        where: { ...UNPAID_RIDES_WHERE, id: { in: rideIds }, driverId: hostId },
        select: { id: true, driverEarnings: true },
      });
      if (rides.length !== rideIds.length) {
        throw new Error("Some of these rides are no longer unpaid. Refresh and try again.");
      }

      const total =
        Math.round(
          (splits.reduce((sum, s) => sum + s.hostEarnings, 0) + rides.reduce((sum, r) => sum + Number(r.driverEarnings ?? 0), 0)) * 100
        ) / 100;

      const created = await tx.payout.create({
        data: { hostId, amount: total, method, reference: reference || null, note: note || null, adminId: admin.id },
      });
      for (const split of splits) {
        // payoutId: null in the filter means a booking can never end up in two payouts.
        const result = await tx.booking.updateMany({
          where: { id: split.id, payoutId: null },
          data: { payoutId: created.id, platformFee: split.platformFee, hostEarnings: split.hostEarnings },
        });
        if (result.count !== 1) throw new Error("A booking was paid out by someone else just now. Refresh and try again.");
      }
      const rideResult = await tx.ride.updateMany({ where: { id: { in: rideIds }, payoutId: null }, data: { payoutId: created.id } });
      if (rideResult.count !== rideIds.length) throw new Error("A ride was paid out by someone else just now. Refresh and try again.");
      return created;
    });

    await logAudit(admin.id, "payout.create", "PAYOUT", payout.id, {
      hostId,
      amount: Number(payout.amount),
      bookings: bookingIds.length,
      rides: rideIds.length,
      feePercent,
      method,
    });
    return NextResponse.json({ success: true, payoutId: payout.id, amount: Number(payout.amount) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
