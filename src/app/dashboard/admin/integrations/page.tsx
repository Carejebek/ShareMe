import { AdminActionButton } from "@/components/admin/AdminActions";
import AdminForm from "@/components/admin/AdminForm";
import { Badge, Callout, Card, DetailRow, PageHeader, TextLink } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { getMapsApiKey, getMapsKeySource, getTwilioConfig, maskSecret, SMS_EVENTS, type SmsEvent } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { twilioReady } from "@/lib/sms";

const SOURCE_LABEL = { db: "Saved here", env: "From server .env", none: "Not set" } as const;

export default async function AdminIntegrationsPage() {
  await requireAdmin();
  const [twilio, mapsKey, mapsSource, lastSms] = await Promise.all([
    getTwilioConfig(),
    getMapsApiKey(),
    getMapsKeySource(),
    prisma.smsMessage.findFirst({ where: { event: { not: "test" } }, orderBy: { createdAt: "desc" }, select: { createdAt: true, status: true } }),
  ]);
  const ready = twilioReady(twilio);
  const smsState = !ready ? "Not configured" : twilio.enabled ? "Live" : "Off";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://jayxz.com").replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect the third-party services JayXZ uses. Secrets are encrypted before they're stored and are never shown again in full."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card
          title="Twilio SMS"
          description="Text messages to renters, hosts, riders and drivers"
          action={<Badge value={smsState === "Live" ? "ACTIVE" : smsState === "Off" ? "INACTIVE" : "PENDING"} label={smsState} />}
        >
          <AdminForm
            endpoint="/api/admin/integrations"
            extraBody={{ section: "twilio" }}
            submitLabel="Save SMS settings"
            successMessage="Saved. All servers pick this up within 30 seconds."
            fields={[
              { name: "enabled", label: "Send SMS notifications", type: "checkbox", defaultValue: twilio.enabled },
              {
                name: "accountSid",
                label: "Account SID",
                defaultValue: twilio.source.accountSid === "db" ? twilio.accountSid : "",
                placeholder: twilio.source.accountSid === "env" ? `${twilio.accountSid} (from .env)` : "AC…",
                hint: "Twilio Console → Account info.",
              },
              {
                name: "authToken",
                label: "Auth Token",
                type: "password",
                placeholder: twilio.authToken ? `${maskSecret(twilio.authToken)} — leave blank to keep` : "32-character token",
                hint: `${SOURCE_LABEL[twilio.source.authToken]}. Only enter a value to replace it.`,
              },
              {
                name: "messagingServiceSid",
                label: "Messaging Service SID (recommended)",
                defaultValue: twilio.messagingServiceSid,
                placeholder: "MG…",
                hint: "Preferred over a single number: handles US A2P 10DLC registration, opt-outs and number pools.",
              },
              {
                name: "fromNumber",
                label: "Or: sending phone number",
                defaultValue: twilio.fromNumber,
                placeholder: "+15551234567",
                hint: "Used only when no Messaging Service SID is set.",
              },
              {
                name: "defaultCountryCode",
                label: "Default country code",
                defaultValue: twilio.defaultCountryCode,
                placeholder: "1",
                hint: "Added to phone numbers saved without one (1 = US/Canada, 233 = Ghana).",
              },
              ...(Object.entries(SMS_EVENTS) as [SmsEvent, string][]).map(([event, label]) => ({
                name: `event.${event}`,
                label: `Text on: ${label}`,
                type: "checkbox" as const,
                defaultValue: twilio.events[event],
              })),
            ]}
          />
        </Card>

        <div className="space-y-6">
          <Card title="Send a test SMS">
            {ready ? (
              <AdminForm
                endpoint="/api/admin/integrations/test"
                method="POST"
                extraBody={{ section: "sms" }}
                submitLabel="Send test"
                successMessage="Sent — check your phone."
                fields={[{ name: "to", label: "Phone number", type: "tel", required: true, placeholder: "+15551234567" }]}
              />
            ) : (
              <p className="text-[13px] text-slate-500">Save an Account SID, Auth Token and a sender first.</p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Tests are sent even while notifications are switched off. <TextLink href="/dashboard/admin/sms">View the SMS log</TextLink>
            </p>
          </Card>

          <Card title="Delivery status webhook">
            <p className="text-[13px] text-slate-600">Set automatically on every message. Nothing to configure in Twilio.</p>
            <p className="mt-2 break-all rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">{appUrl}/api/sms/status</p>
            <div className="mt-3">
              <DetailRow label="Last notification">
                {lastSms ? `${lastSms.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} · ${lastSms.status}` : "None yet"}
              </DetailRow>
            </div>
          </Card>

          <Callout tone="info" title="Before texting US numbers">
            US carriers block business texts from unregistered numbers. Register an A2P 10DLC campaign (or use a verified toll-free number)
            in the Twilio Console. Every notification ends with &quot;Reply STOP to opt out&quot;, and Twilio blocks texts to anyone who replies STOP.
          </Callout>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card
          title="Google Maps Platform"
          description="Address search and route pricing on Book a Ride"
          action={<Badge value={mapsKey ? "ACTIVE" : "PENDING"} label={mapsKey ? "Connected" : "Not configured"} />}
        >
          <div className="mb-4">
            <DetailRow label="API key">{mapsKey ? maskSecret(mapsKey) : "—"}</DetailRow>
            <DetailRow label="Source">{SOURCE_LABEL[mapsSource]}</DetailRow>
          </div>
          <AdminForm
            endpoint="/api/admin/integrations"
            extraBody={{ section: "maps" }}
            submitLabel="Save key"
            successMessage="Saved. All servers pick this up within 30 seconds."
            resetOnSuccess
            fields={[
              {
                name: "apiKey",
                label: mapsKey ? "Replace API key" : "API key",
                type: "password",
                required: true,
                placeholder: "AIza…",
                hint: "Google Cloud Console → APIs & Services → Credentials.",
              },
            ]}
          />
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <AdminActionButton
              endpoint="/api/admin/integrations/test"
              method="POST"
              body={{ section: "maps" }}
              label="Test address search"
              successMessage="Address search is working."
              variant="outline"
              disabled={!mapsKey}
            />
            {mapsSource === "db" && (
              <AdminActionButton
                endpoint="/api/admin/integrations"
                body={{ section: "remove", key: "maps.apiKey" }}
                label="Remove saved key"
                variant="outline"
                confirm="Remove the saved Google Maps key? Address search will stop working unless a key is set in .env."
              />
            )}
          </div>
        </Card>

        <Card title="Google Cloud setup">
          <ol className="list-decimal space-y-2 pl-4 text-[13px] text-slate-600">
            <li>
              Enable <strong>Places API (New)</strong>, <strong>Routes API</strong>, <strong>Geocoding API</strong> and <strong>Maps Static API</strong> on the project.
            </li>
            <li>Turn on billing for the project (Google requires it, even within the free monthly credit).</li>
            <li>
              Restrict the key to those four APIs. It&apos;s only used from this server, so an IP-address restriction to the server is
              the safest option.
            </li>
            <li>Set a budget alert in Google Cloud Billing.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
