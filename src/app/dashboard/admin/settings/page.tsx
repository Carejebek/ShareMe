import AdminForm from "@/components/admin/AdminForm";
import RidePricingForm from "@/components/admin/RidePricingForm";
import { Card, PageHeader } from "@/components/admin/ui";
import { money, requireAdmin } from "@/lib/admin";
import { getPlatformFeePercent, getRidePricing, getSupportContact, splitEarnings } from "@/lib/settings";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [feePercent, support, pricing] = await Promise.all([getPlatformFeePercent(), getSupportContact(), getRidePricing()]);
  const example = splitEarnings(100, feePercent);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Platform-wide settings. Every change is recorded in the audit log." />

      <Card
        title="Ride pricing"
        description="Fare = base + time + distance (at least the minimum), plus the booking fee. Changes apply to new quotes straight away; booked rides keep their price."
        className="max-w-4xl"
      >
        <RidePricingForm pricing={pricing} feePercent={feePercent} />
      </Card>

      <Card title="Platform fee" className="max-w-2xl">
        <p className="mb-5 text-[13px] text-slate-600">
          The share JayXZ keeps from each completed rental. On a {money(100)} trip, JayXZ keeps {money(example.platformFee)} and the
          host gets {money(example.hostEarnings)}. Changing it affects trips that haven&apos;t been paid out yet; trips already paid
          out keep the fee they were paid with.
        </p>
        <AdminForm
          endpoint="/api/admin/settings"
          submitLabel="Save fee"
          confirm="Change the platform fee to {platformFeePercent}%?"
          fields={[
            { name: "platformFeePercent", label: "Platform fee (%)", type: "number", step: "0.5", min: 0, max: 100, required: true, defaultValue: feePercent },
          ]}
        />
      </Card>

      <Card title="Support contact" description="Shown on the public Support page (/support)" className="max-w-2xl">
        <AdminForm
          endpoint="/api/admin/settings"
          submitLabel="Save contact details"
          fields={[
            { name: "supportEmail", label: "Support email", defaultValue: support.email, placeholder: "support@jayxz.com" },
            { name: "supportPhone", label: "Support phone", type: "tel", defaultValue: support.phone, placeholder: "+1 555 123 4567" },
            { name: "supportHours", label: "Hours", defaultValue: support.hours, placeholder: "Mon–Fri, 9am–6pm ET" },
          ]}
        />
      </Card>
    </div>
  );
}
