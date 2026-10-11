import { after } from "next/server";
import type { BookingStatus, RideStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

// SMS notifications for booking and ride changes. Each function is safe to call from any route handler:
// the work runs after the response is sent, and failures are only logged.

const APP = "JayXZ";
const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function notifyBookingStatus(bookingId: string, status: BookingStatus) {
  if (status !== "CONFIRMED" && status !== "CANCELLED") return;
  after(async () => {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        renter: { select: { id: true, name: true, phone: true } },
        listing: { select: { year: true, make: true, model: true, host: { select: { id: true, name: true, phone: true } } } },
      },
    });
    if (!booking) return;
    const car = `${booking.listing.year} ${booking.listing.make} ${booking.listing.model}`;
    const dates = `${short(booking.startDate)}–${short(booking.endDate)}`;
    const event = status === "CONFIRMED" ? "booking.confirmed" : "booking.cancelled";
    const renterText =
      status === "CONFIRMED"
        ? `${APP}: Your ${car} trip on ${dates} is confirmed. Reply STOP to opt out.`
        : `${APP}: Your ${car} booking for ${dates} was cancelled. Reply STOP to opt out.`;
    const hostText =
      status === "CONFIRMED"
        ? `${APP}: ${booking.renter.name} booked your ${car} for ${dates}.`
        : `${APP}: The ${dates} booking of your ${car} was cancelled.`;

    await Promise.all([
      sendSms({ to: booking.renter.phone, body: renterText, event, userId: booking.renter.id }),
      sendSms({ to: booking.listing.host.phone, body: hostText, event, userId: booking.listing.host.id }),
    ]);
  });
}

const RIDE_EVENTS: Partial<Record<RideStatus, "ride.accepted" | "ride.en_route" | "ride.in_progress" | "ride.completed" | "ride.cancelled">> = {
  ACCEPTED: "ride.accepted",
  EN_ROUTE: "ride.en_route",
  IN_PROGRESS: "ride.in_progress",
  COMPLETED: "ride.completed",
  CANCELLED: "ride.cancelled",
};

export function notifyRideStatus(rideId: string, status: RideStatus) {
  const event = RIDE_EVENTS[status];
  if (!event) return;
  after(async () => {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: { select: { id: true, name: true, phone: true } } },
    });
    if (!ride) return;
    const pickup = ride.pickupAddress.split(",")[0];
    const driver = ride.driver?.name?.split(" ")[0] ?? "Your driver";
    const fare = `${ride.currency} ${Number(ride.totalPrice).toFixed(2)}`;

    const riderText = {
      "ride.accepted": `${APP}: ${driver} will pick you up at ${pickup}.${ride.driver?.phone ? ` Driver: ${ride.driver.phone}.` : ""}`,
      "ride.en_route": `${APP}: ${driver} is on the way to ${pickup}.`,
      "ride.in_progress": `${APP}: Your trip has started. Enjoy the ride!`,
      "ride.completed": `${APP}: You've arrived. Fare: ${fare}, paid to your driver. Thanks for riding!`,
      "ride.cancelled": `${APP}: Your ride from ${pickup} was cancelled.`,
    }[event];

    const sends = [sendSms({ to: ride.riderPhone, body: `${riderText} Reply STOP to opt out.`, event, userId: ride.riderId })];
    if (event === "ride.cancelled" && ride.driver) {
      sends.push(
        sendSms({ to: ride.driver.phone, body: `${APP}: The ride from ${pickup} was cancelled.`, event, userId: ride.driver.id })
      );
    }
    await Promise.all(sends);
  });
}
