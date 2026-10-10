import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { splitEarnings } from "@/lib/settings";

// A host is owed money for a booking once the trip is completed, the renter's payment went through
// (and wasn't fully refunded) and it hasn't been included in a payout yet.
export const UNPAID_EARNINGS_WHERE = {
  status: "COMPLETED",
  payoutId: null,
  payment: { status: "SUCCEEDED" },
} satisfies Prisma.BookingWhereInput;

export async function getUnpaidBookings(hostId?: string) {
  const bookings = await prisma.booking.findMany({
    where: { ...UNPAID_EARNINGS_WHERE, ...(hostId ? { listing: { hostId } } : {}) },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      payment: { select: { amount: true, refundedAmount: true } },
      listing: { select: { year: true, make: true, model: true, host: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: { endDate: "asc" },
  });
  return bookings.map((b) => ({
    ...b,
    netPaid: Number(b.payment!.amount) - Number(b.payment!.refundedAmount),
  }));
}

export function owedFor(bookings: { netPaid: number }[], feePercent: number) {
  return bookings.reduce(
    (totals, b) => {
      const split = splitEarnings(b.netPaid, feePercent);
      return {
        gross: totals.gross + b.netPaid,
        fee: totals.fee + split.platformFee,
        host: totals.host + split.hostEarnings,
      };
    },
    { gross: 0, fee: 0, host: 0 }
  );
}
