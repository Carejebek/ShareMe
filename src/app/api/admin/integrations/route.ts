import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { saveSettings, SMS_EVENTS } from "@/lib/integrations";

const optional = (pattern: RegExp, message: string) =>
  z.string().trim().refine((v) => v === "" || pattern.test(v), message);

const twilioSchema = z.object({
  section: z.literal("twilio"),
  enabled: z.boolean(),
  accountSid: optional(/^AC[0-9a-fA-F]{32}$/, "The Account SID starts with AC followed by 32 characters."),
  // Left blank to keep the saved token.
  authToken: optional(/^[0-9a-fA-F]{32}$/, "The Auth Token is 32 characters (letters a–f and numbers)."),
  fromNumber: optional(/^\+[1-9]\d{7,14}$/, "The sending number must be in +15551234567 format."),
  messagingServiceSid: optional(/^MG[0-9a-fA-F]{32}$/, "The Messaging Service SID starts with MG followed by 32 characters."),
  defaultCountryCode: optional(/^\+?\d{1,3}$/, "The default country code is 1–3 digits, e.g. 1 or 233."),
});

const mapsSchema = z.object({
  section: z.literal("maps"),
  // Left blank to keep the saved key.
  apiKey: optional(/^[A-Za-z0-9_-]{30,60}$/, "That doesn't look like a Google API key (they start with AIza)."),
});

const removeSchema = z.object({ section: z.literal("remove"), key: z.enum(["twilio.authToken", "maps.apiKey"]) });

const schema = z.discriminatedUnion("section", [twilioSchema, mapsSchema, removeSchema]);

// PATCH /api/admin/integrations — save Twilio or Google Maps settings. Secret values are never echoed back or logged.
export async function PATCH(req: NextRequest) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, { status: 400 });
  }
  const body = parsed.data;

  if (body.section === "twilio") {
    const entries: Record<string, string> = {
      "twilio.enabled": body.enabled ? "on" : "off",
      "twilio.accountSid": body.accountSid,
      "twilio.fromNumber": body.fromNumber,
      "twilio.messagingServiceSid": body.messagingServiceSid,
      "twilio.defaultCountryCode": body.defaultCountryCode.replace("+", ""),
    };
    if (body.authToken) entries["twilio.authToken"] = body.authToken;
    // Event switches arrive as flat checkbox fields named "event.<name>".
    const events: Record<string, boolean> = {};
    for (const event of Object.keys(SMS_EVENTS)) {
      const on = raw?.[`event.${event}`];
      if (typeof on === "boolean") {
        events[event] = on;
        entries[`sms.event.${event}`] = on ? "on" : "off";
      }
    }
    await saveSettings(entries);
    await logAudit(admin.id, "integration.update", "SETTING", "twilio", {
      enabled: body.enabled,
      accountSid: body.accountSid || "(env)",
      fromNumber: body.fromNumber || null,
      messagingServiceSid: body.messagingServiceSid || null,
      authTokenChanged: Boolean(body.authToken),
      eventsOff: Object.entries(events).filter(([, on]) => !on).map(([e]) => e).join(", ") || null,
    });
  } else if (body.section === "maps") {
    if (body.apiKey) {
      await saveSettings({ "maps.apiKey": body.apiKey });
      await logAudit(admin.id, "integration.update", "SETTING", "maps", { apiKeyChanged: true });
    }
  } else {
    await saveSettings({ [body.key]: "" });
    await logAudit(admin.id, "integration.update", "SETTING", body.key.split(".")[0], { removed: body.key });
  }

  return NextResponse.json({ success: true });
}
