import { AdminActionButton } from "@/components/admin/AdminActions";
import { Badge } from "@/components/admin/ui";
import { dateTime } from "@/lib/admin";

// The licence photo plus Verify / Reject buttons. Used on the queue page and the user page.
export default function VerificationReview({
  user,
}: {
  user: {
    id: string;
    name: string;
    verificationStatus: string;
    licenseImagePath: string | null;
    verificationNote: string | null;
    verifiedAt: Date | null;
  };
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[320px_1fr]">
      {user.licenseImagePath ? (
        <a href={`/api/admin/users/${user.id}/license`} target="_blank" rel="noreferrer" title="Open full size">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/users/${user.id}/license`}
            alt={`${user.name}'s driver's licence`}
            className="max-h-56 w-full rounded-2xl bg-neutral-100 object-contain"
          />
        </a>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-neutral-100 text-sm text-neutral-400">
          No licence uploaded
        </div>
      )}
      <div className="space-y-3 text-sm">
        <Badge value={user.verificationStatus} />
        {user.verificationStatus === "VERIFIED" && <p className="text-neutral-500">Verified {dateTime(user.verifiedAt)}</p>}
        {user.verificationStatus === "REJECTED" && user.verificationNote && (
          <p className="text-neutral-600">Rejected: {user.verificationNote}</p>
        )}
        <p className="text-neutral-500">
          Check that the name matches the account, the licence hasn&apos;t expired and the photo is clear.
        </p>
        {user.licenseImagePath && (
          <div className="flex flex-wrap gap-2">
            {user.verificationStatus !== "VERIFIED" && (
              <AdminActionButton
                endpoint={`/api/admin/users/${user.id}`}
                body={{ action: "verify", decision: "VERIFIED" }}
                label="Verify licence"
                variant="green"
              />
            )}
            {user.verificationStatus !== "REJECTED" && (
              <AdminActionButton
                endpoint={`/api/admin/users/${user.id}`}
                body={{ action: "verify", decision: "REJECTED" }}
                label="Reject"
                variant="outline"
                promptFor={{ field: "note", message: "Why is the licence being rejected? The user will see this." }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
