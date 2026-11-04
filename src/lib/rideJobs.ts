import { alertDrivers, notifyRideExpired, sendRideReminder } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { releaseRideHold } from "@/lib/ridePayments";
import { sendDueInsuranceReminders } from "@/lib/driverDocs";

// Time-based ride housekeeping. Runs every minute from cron (/api/cron/rides) and, as a backup,
// whenever the rider or dispatch pages poll. Each step claims rides with a conditional update,
// so running it on several servers at once never double-cancels or double-texts.

const MINUTE = 60_000;
export const REQUEST_TIMEOUT_MINUTES = Number(process.env.RIDE_REQUEST_TIMEOUT_MINUTES) || 10;
const CHECKOUT_TIMEOUT_MINUTES = 30;
const REMINDER_MINUTES_BEFORE = 45;

let lastRun = 0;

// Throttled version for page polls: at most once every 30 seconds per server process.
export function runRideJobsSoon() {
  if (Date.now() - lastRun < 30_000) return;
  lastRun = Date.now();
  void runRideJobs().catch((error) => console.error("Ride jobs failed:", error));
}

export async function runRideJobs() {
  lastRun = Date.now();
  const now = new Date();
  const summary = { abandoned: 0, expired: 0, reminders: 0, realerts: 0, insuranceReminders: 0 };

  // 1. Checkout never finished: cancel and release whatever Stripe has.
  const abandoned = await prisma.ride.findMany({
    where: { status: "AWAITING_PAYMENT", createdAt: { lt: new Date(now.getTime() - CHECKOUT_TIMEOUT_MINUTES * MINUTE) } },
    take: 100,
  });
  for (const ride of abandoned) {
    const claimed = await prisma.ride.updateMany({
      where: { id: ride.id, status: "AWAITING_PAYMENT" },
      data: { status: "CANCELLED", cancelledAt: now, cancelReason: "Payment wasn't completed" },
    });
    if (claimed.count) {
      await releaseRideHold(ride);
      summary.abandoned++;
    }
  }

  // 2. Nobody accepted in time. ASAP rides: REQUEST_TIMEOUT_MINUTES after the hold succeeded.
  //    Scheduled rides: 5 minutes after the pickup time.
  const expired = await prisma.ride.findMany({
    where: {
      status: "REQUESTED",
      driverId: null,
      OR: [
        { scheduledAt: null, requestedAt: { lt: new Date(now.getTime() - REQUEST_TIMEOUT_MINUTES * MINUTE) } },
        // Rides booked before card payments existed have no requestedAt.
        { scheduledAt: null, requestedAt: null, createdAt: { lt: new Date(now.getTime() - REQUEST_TIMEOUT_MINUTES * MINUTE) } },
        { scheduledAt: { lt: new Date(now.getTime() - 5 * MINUTE) } },
      ],
    },
    take: 100,
  });
  for (const ride of expired) {
    const claimed = await prisma.ride.updateMany({
      where: { id: ride.id, status: "REQUESTED", driverId: null },
      data: { status: "CANCELLED", cancelledAt: now, cancelReason: "No driver was available" },
    });
    if (claimed.count) {
      await releaseRideHold(ride);
      await notifyRideExpired(ride.id);
      summary.expired++;
    }
  }

  // 3. Scheduled rides coming up: remind the rider and driver, or re-alert drivers if nobody has taken it.
  const upcoming = await prisma.ride.findMany({
    where: {
      status: { in: ["REQUESTED", "ACCEPTED"] },
      reminderSentAt: null,
      scheduledAt: { gt: now, lt: new Date(now.getTime() + REMINDER_MINUTES_BEFORE * MINUTE) },
    },
    take: 100,
  });
  for (const ride of upcoming) {
    const claimed = await prisma.ride.updateMany({ where: { id: ride.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (!claimed.count) continue;
    if (ride.driverId) {
      await sendRideReminder(ride.id);
      summary.reminders++;
    } else {
      await alertDrivers(ride.id, true);
      summary.realerts++;
    }
  }

  // 4. Driver insurance expiring soon or just expired: text the driver (each stage once).
  try {
    summary.insuranceReminders = await sendDueInsuranceReminders(now);
  } catch (error) {
    console.error("Insurance reminders failed:", error);
  }

  return summary;
}
