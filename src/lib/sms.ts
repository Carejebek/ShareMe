import { createHmac, timingSafeEqual } from "crypto";
import { getTwilioConfig, type SmsEvent, type TwilioConfig } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

// Turns what people type ("(603) 555-0142", "024 123 4567", "+233 24…") into E.164 (+16035550142).
// Numbers without a country code get the default one from the SMS settings.
export function toE164(raw: string | null | undefined, defaultCountryCode = "1"): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.startsWith("00")) return toE164(`+${digits.slice(2)}`);
  const cc = defaultCountryCode.replace(/\D/g, "") || "1";
  if (cc === "1") {
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    return digits.length === 10 ? `+1${digits}` : null;
  }
  if (digits.startsWith("0")) digits = digits.slice(1); // trunk prefix, e.g. 024… in Ghana
  const full = `${cc}${digits}`;
  return full.length >= 8 && full.length <= 15 ? `+${full}` : null;
}

export function twilioReady(config: TwilioConfig) {
  return Boolean(config.accountSid && config.authToken && (config.fromNumber || config.messagingServiceSid));
}

function statusCallbackUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  return base?.startsWith("https://") ? `${base.replace(/\/$/, "")}/api/sms/status` : undefined;
}

type SendResult = { ok: true; sid: string; id: string } | { ok: false; error: string; id?: string };

// Sends one SMS through Twilio's REST API and records it in SmsMessage.
// Never throws: a failed text must not break the booking or ride action that triggered it.
export async function sendSms({
  to,
  body,
  event,
  userId,
  force = false,
}: {
  to: string | null | undefined;
  body: string;
  event: SmsEvent | "test";
  userId?: string | null;
  // Test messages are sent even when SMS or the event is switched off.
  force?: boolean;
}): Promise<SendResult> {
  try {
    const config = await getTwilioConfig();
    if (!force && (!config.enabled || (event !== "test" && !config.events[event]))) {
      return { ok: false, error: "SMS is switched off for this event." };
    }
    if (!twilioReady(config)) return { ok: false, error: "Twilio isn't configured yet." };

    const number = toE164(to, config.defaultCountryCode);
    const text = body.slice(0, 1500);
    if (!number) {
      const log = await prisma.smsMessage.create({
        data: { to: to ?? "", body: text, event, status: "skipped", error: "Not a valid phone number", userId: userId ?? null },
      });
      return { ok: false, error: "Not a valid phone number.", id: log.id };
    }

    const log = await prisma.smsMessage.create({ data: { to: number, body: text, event, status: "queued", userId: userId ?? null } });

    const form = new URLSearchParams({ To: number, Body: text });
    if (config.messagingServiceSid) form.set("MessagingServiceSid", config.messagingServiceSid);
    else form.set("From", config.fromNumber);
    const callback = statusCallbackUrl();
    if (callback) form.set("StatusCallback", callback);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await response.json().catch(() => ({}))) as { sid?: string; status?: string; message?: string; code?: number };

    if (!response.ok || !data.sid) {
      const error = `${data.message ?? `Twilio returned ${response.status}`}${data.code ? ` (code ${data.code})` : ""}`;
      await prisma.smsMessage.update({ where: { id: log.id }, data: { status: "failed", error } });
      return { ok: false, error, id: log.id };
    }

    await prisma.smsMessage.update({ where: { id: log.id }, data: { status: data.status ?? "queued", twilioSid: data.sid } });
    return { ok: true, sid: data.sid, id: log.id };
  } catch (error) {
    console.error("SMS send failed:", error);
    return { ok: false, error: (error as Error).message || "SMS send failed." };
  }
}

// Twilio signs each webhook: HMAC-SHA1 over the full URL followed by every POST param (sorted, key+value),
// keyed with the auth token, base64-encoded in the X-Twilio-Signature header.
export function validTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string | null) {
  if (!signature || !authToken) return false;
  const payload = url + Object.keys(params).sort().map((key) => key + params[key]).join("");
  const expected = createHmac("sha1", authToken).update(payload, "utf8").digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
