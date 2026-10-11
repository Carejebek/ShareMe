import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { autocomplete, MapsError } from "@/lib/maps";
import { rateLimit } from "@/lib/rateLimit";
import { sendSms } from "@/lib/sms";

const schema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("sms"), to: z.string().trim().min(5).max(30) }),
  z.object({ section: z.literal("maps") }),
]);

// POST /api/admin/integrations/test — send a test SMS, or check the Google Maps key with a sample search.
export async function POST(req: NextRequest) {
  const { admin, error } = await requireAdminApi();
  if (error) return error;
  if (!rateLimit(`integration-test:${admin.id}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many tests. Try again in a few minutes." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a phone number to text." }, { status: 400 });

  if (parsed.data.section === "sms") {
    const result = await sendSms({
      to: parsed.data.to,
      body: "JayXZ: This is a test message from the admin portal. SMS is working.",
      event: "test",
      userId: admin.id,
      force: true,
    });
    await logAudit(admin.id, "integration.test", "SETTING", "twilio", { to: parsed.data.to, ok: result.ok });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
    return NextResponse.json({ success: true, sid: result.sid });
  }

  try {
    const results = await autocomplete("1600 Pennsylvania Avenue");
    return NextResponse.json({ success: true, results: results.length });
  } catch (e) {
    const message = e instanceof MapsError ? e.message : "The key didn't work.";
    return NextResponse.json({ error: `${message} Check the key and that Places API (New) is enabled.` }, { status: 502 });
  }
}
