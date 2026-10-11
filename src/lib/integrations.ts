import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// Third-party credentials (Twilio, Google Maps) are set by admins on the Integrations page and stored
// in the Setting table. Secrets are encrypted with AES-256-GCM using INTEGRATIONS_SECRET (or NEXTAUTH_SECRET).
// Environment variables still work as a fallback, so a key can also be set in .env.

function encryptionKey() {
  const secret = process.env.INTEGRATIONS_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("INTEGRATIONS_SECRET or NEXTAUTH_SECRET must be set to store integration secrets.");
  return createHash("sha256").update(`integrations:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}

export function decryptSecret(stored: string): string | null {
  try {
    const [version, iv, tag, data] = stored.split(":");
    if (version !== "v1") return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key (e.g. NEXTAUTH_SECRET changed) or corrupted value: treat as not set.
    return null;
  }
}

// Shows enough of a secret to recognise it, never the whole thing.
export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  return value.length <= 12 ? "••••" : `••••${value.slice(-4)}`;
}

export const SECRET_KEYS = ["twilio.authToken", "maps.apiKey"] as const;

export const SMS_EVENTS = {
  "booking.confirmed": "Booking confirmed (renter and host)",
  "booking.cancelled": "Booking cancelled (renter and host)",
  "ride.requested": "New ride request (approved drivers)",
  "ride.accepted": "Driver assigned to a ride (rider)",
  "ride.en_route": "Driver on the way (rider)",
  "ride.in_progress": "Trip started (rider)",
  "ride.completed": "Ride completed (rider)",
  "ride.cancelled": "Ride cancelled (rider and driver)",
  "ride.expired": "No driver found, hold released (rider)",
  "ride.reminder": "Scheduled ride reminder (rider and driver)",
} as const;
export type SmsEvent = keyof typeof SMS_EVENTS;

// Values are cached briefly per server process so every SMS or address search doesn't hit the database.
let cache: { at: number; values: Map<string, string> } | null = null;
const CACHE_MS = 30_000;

async function settings(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.values;
  const rows = await prisma.setting.findMany({ where: { OR: [{ key: { startsWith: "twilio." } }, { key: { startsWith: "maps." } }, { key: { startsWith: "sms." } }] } });
  const values = new Map(rows.map((r) => [r.key, r.value]));
  cache = { at: Date.now(), values };
  return values;
}

export function clearIntegrationCache() {
  cache = null;
}

async function read(key: string, envName?: string): Promise<string> {
  const values = await settings();
  const raw = values.get(key);
  if (raw !== undefined && raw !== "") {
    return (SECRET_KEYS as readonly string[]).includes(key) ? decryptSecret(raw) ?? "" : raw;
  }
  return (envName && process.env[envName]?.trim()) || "";
}

export type TwilioConfig = {
  enabled: boolean;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  messagingServiceSid: string;
  defaultCountryCode: string;
  events: Record<SmsEvent, boolean>;
  source: { accountSid: "db" | "env" | "none"; authToken: "db" | "env" | "none" };
};

export async function getTwilioConfig(): Promise<TwilioConfig> {
  const values = await settings();
  const sourceOf = (key: string, env: string) => (values.get(key) ? "db" : process.env[env] ? "env" : "none") as "db" | "env" | "none";
  const events = Object.fromEntries(
    (Object.keys(SMS_EVENTS) as SmsEvent[]).map((event) => [event, values.get(`sms.event.${event}`) !== "off"])
  ) as Record<SmsEvent, boolean>;

  return {
    enabled: values.has("twilio.enabled") ? values.get("twilio.enabled") === "on" : process.env.TWILIO_ENABLED === "1",
    accountSid: await read("twilio.accountSid", "TWILIO_ACCOUNT_SID"),
    authToken: await read("twilio.authToken", "TWILIO_AUTH_TOKEN"),
    fromNumber: await read("twilio.fromNumber", "TWILIO_FROM_NUMBER"),
    messagingServiceSid: await read("twilio.messagingServiceSid", "TWILIO_MESSAGING_SERVICE_SID"),
    defaultCountryCode: (await read("twilio.defaultCountryCode", "SMS_DEFAULT_COUNTRY_CODE")) || "1",
    events,
    source: {
      accountSid: sourceOf("twilio.accountSid", "TWILIO_ACCOUNT_SID"),
      authToken: sourceOf("twilio.authToken", "TWILIO_AUTH_TOKEN"),
    },
  };
}

export async function getMapsApiKey(): Promise<string> {
  return read("maps.apiKey", "GOOGLE_MAPS_API_KEY");
}

export async function getMapsKeySource(): Promise<"db" | "env" | "none"> {
  const values = await settings();
  return values.get("maps.apiKey") ? "db" : process.env.GOOGLE_MAPS_API_KEY ? "env" : "none";
}

// Saves settings; secrets are encrypted. An empty string removes the database value (falls back to .env).
export async function saveSettings(entries: Record<string, string>) {
  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) => {
      if (value === "") return prisma.setting.deleteMany({ where: { key } });
      const stored = (SECRET_KEYS as readonly string[]).includes(key) ? encryptSecret(value) : value;
      return prisma.setting.upsert({ where: { key }, create: { key, value: stored }, update: { value: stored } });
    })
  );
  clearIntegrationCache();
}
