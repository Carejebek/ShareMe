import { AdminActionButton } from "@/components/admin/AdminActions";
import { Badge, Callout, DetailRow } from "@/components/admin/ui";
import { dateTime, shortDate } from "@/lib/admin";

type Profile = {
  status: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  vehiclePlate: string;
  insuranceExpiresAt: Date;
  reviewNote: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
};

// Driver application: vehicle, insurance document and Approve / Reject. Used on the Drivers page and the user page.
export default function DriverReview({
  user,
  profile,
}: {
  user: { id: string; name: string; verificationStatus: string };
  profile: Profile;
}) {
  const insuranceExpired = profile.insuranceExpiresAt < new Date();
  const licenceOk = user.verificationStatus === "VERIFIED";

  return (
    <div className="grid gap-5 md:grid-cols-[320px_1fr]">
      <a href={`/api/admin/users/${user.id}/insurance`} target="_blank" rel="noreferrer" title="Open full size">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/admin/users/${user.id}/insurance`}
          alt={`${user.name}'s insurance document`}
          className="max-h-56 w-full rounded-lg bg-slate-100 object-contain"
        />
      </a>
      <div className="space-y-3 text-[13px]">
        <div className="flex flex-wrap gap-2">
          <Badge value={profile.status === "APPROVED" ? "APPROVED" : profile.status === "REJECTED" ? "REJECTED" : "PENDING"} label={`Driver ${profile.status.toLowerCase()}`} />
          <Badge value={user.verificationStatus} label={`Licence ${user.verificationStatus.toLowerCase()}`} />
          {insuranceExpired && <Badge value="FAILED" label="Insurance expired" />}
        </div>
        <div>
          <DetailRow label="Vehicle">
            {profile.vehicleColor} {profile.vehicleYear} {profile.vehicleMake} {profile.vehicleModel}
          </DetailRow>
          <DetailRow label="Plate">
            <span className="font-mono">{profile.vehiclePlate}</span>
          </DetailRow>
          <DetailRow label="Insurance expires">{shortDate(profile.insuranceExpiresAt)}</DetailRow>
          <DetailRow label="Submitted">{dateTime(profile.submittedAt)}</DetailRow>
          {profile.reviewedAt && <DetailRow label="Reviewed">{dateTime(profile.reviewedAt)}</DetailRow>}
        </div>
        {profile.status === "REJECTED" && profile.reviewNote && <p className="text-slate-600">Rejected: {profile.reviewNote}</p>}
        {!licenceOk && (
          <Callout tone="warn" title="Licence not verified">
            Verify their driver&apos;s licence on their user page before approving.
          </Callout>
        )}
        <p className="text-slate-500">Check the insurance names this driver and this car, and covers carrying paying passengers.</p>
        <div className="flex flex-wrap gap-2">
          {profile.status !== "APPROVED" && (
            <AdminActionButton
              endpoint={`/api/admin/users/${user.id}`}
              body={{ action: "driver", decision: "APPROVED" }}
              label="Approve driver"
              variant="green"
              disabled={!licenceOk || insuranceExpired}
            />
          )}
          <AdminActionButton
            endpoint={`/api/admin/users/${user.id}`}
            body={{ action: "driver", decision: "REJECTED" }}
            label={profile.status === "APPROVED" ? "Revoke driver" : "Reject"}
            variant="outline"
            promptFor={{ field: "note", message: `Why is ${user.name}'s driver account being ${profile.status === "APPROVED" ? "revoked" : "rejected"}? They will see this.` }}
          />
        </div>
      </div>
    </div>
  );
}
