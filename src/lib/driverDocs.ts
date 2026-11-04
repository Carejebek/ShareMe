import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

// Driver insurance expiry reminders. Drivers can't take rides once their insurance expires
// (see getActiveDriver), so they're texted 30, 7 and 1 day(s) before, and once when it lapses.
// Each stage is sent once per expiry date: uploading new insurance (a new date) starts over.

const DAY = 24 * 60 * 60 * 1000;
export const REMINDER_STAGES = [30, 7, 1, 0] as const;
export const EXPIRY_WARNING_DAYS = 30;
// Lapsed insurance is only texted about for a week; after that it's up to an admin.
const EXPIRED_TEXT_WINDOW_DAYS = 7;

// Whole days left, rounded up: anything later today is 1, already past is 0 or less.
export function daysLeft(expiresAt: Date, now = new Date()) {
  return Math.ceil((expiresAt.getTime() - now.getTime()) / DAY);
}

// The reminder that's due now: 30, 7, 1, 0 (expired), or null when it's more than 30 days away.
export function reminderStage(expiresAt: Date, now = new Date()): number | null {
  const left = daysLeft(expiresAt, now);
  if (left <= 0) return 0;
  for (const stage of [1, 7, 30]) if (left <= stage) return stage;
  return null;
}

// The reminder already sent for the current insurance date, if any.
export function sentStage(p: { insuranceExpiresAt: Date; insuranceReminderFor: Date | null; insuranceReminderDays: number | null }) {
  return p.insuranceReminderFor?.getTime() === p.insuranceExpiresAt.getTime() ? p.insuranceReminderDays : null;
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://jayxz.com").replace(/\/$/, "");
}

export function reminderText(expiresAt: Date, stage: number) {
  const date = expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const upload = `Upload your new insurance at ${appUrl()}/drive`;
  if (stage === 0) return `JayXZ: Your car insurance on file expired on ${date}, so you can't take rides right now. ${upload} to start driving again.`;
  const when = stage === 1 ? "within 24 hours" : `in ${stage} days`;
  return `JayXZ: Your car insurance on file expires ${when} (${date}). ${upload} so you can keep taking rides.`;
}

// Texts one driver the reminder that's due (or `stage` if given) and records it.
// Returns false if someone else already sent this stage (two servers, or a double-click).
export async function sendInsuranceReminder(profileId: string, stage?: number, { manual = false } = {}) {
  const profile = await prisma.driverProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { id: true, phone: true } } },
  });
  if (!profile) return { ok: false, error: "Driver not found." };
  const due = stage ?? reminderStage(profile.insuranceExpiresAt);
  if (due === null) return { ok: false, error: "Their insurance isn't expiring within 30 days." };

  if (!manual) {
    // Claim the stage first so it's only ever texted once for this insurance date.
    const claimed = await prisma.driverProfile.updateMany({
      where: {
        id: profile.id,
        insuranceExpiresAt: profile.insuranceExpiresAt,
        OR: [
          { insuranceReminderFor: null },
          { insuranceReminderFor: { not: profile.insuranceExpiresAt } },
          { insuranceReminderDays: null },
          { insuranceReminderDays: { gt: due } },
        ],
      },
      data: { insuranceReminderFor: profile.insuranceExpiresAt, insuranceReminderDays: due },
    });
    if (claimed.count === 0) return { ok: false, error: "Already sent." };
  } else {
    await prisma.driverProfile.update({
      where: { id: profile.id },
      data: { insuranceReminderFor: profile.insuranceExpiresAt, insuranceReminderDays: due },
    });
  }

  const result = await sendSms({
    to: profile.user.phone,
    body: reminderText(profile.insuranceExpiresAt, due),
    event: "driver.insurance",
    userId: profile.user.id,
  });
  return result.ok ? { ok: true, error: "" } : { ok: false, error: result.error };
}

// Run from the ride jobs cron. Only texts during the afternoon/evening UTC
// (afternoon in Ghana, morning to evening in the US) so nobody is woken up.
export async function sendDueInsuranceReminders(now = new Date()) {
  const hour = now.getUTCHours();
  if (hour < 14 || hour >= 22) return 0;

  const profiles = await prisma.driverProfile.findMany({
    where: {
      status: "APPROVED",
      insuranceExpiresAt: {
        lt: new Date(now.getTime() + EXPIRY_WARNING_DAYS * DAY),
        gt: new Date(now.getTime() - EXPIRED_TEXT_WINDOW_DAYS * DAY),
      },
      user: { suspendedAt: null },
    },
    select: { id: true, insuranceExpiresAt: true, insuranceReminderFor: true, insuranceReminderDays: true },
    take: 200,
  });

  let sent = 0;
  for (const p of profiles) {
    const due = reminderStage(p.insuranceExpiresAt, now);
    const already = sentStage(p);
    if (due === null || (already !== null && already <= due)) continue;
    const result = await sendInsuranceReminder(p.id, due);
    if (result.ok) sent++;
  }
  return sent;
}
