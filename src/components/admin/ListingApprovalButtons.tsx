"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  listingId: string;
  currentStatus: "PENDING" | "APPROVED" | "REJECTED";
};

export default function ListingApprovalButtons({
  listingId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function updateStatus(status: "APPROVED" | "REJECTED") {
    setLoading(status);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/listings/${listingId}/approval`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to update vehicle.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to update vehicle.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading !== null || currentStatus === "APPROVED"}
          onClick={() => updateStatus("APPROVED")}
          className="rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-40"
        >
          {loading === "APPROVED" ? "Approving..." : "Approve"}
        </button>

        <button
          type="button"
          disabled={loading !== null || currentStatus === "REJECTED"}
          onClick={() => updateStatus("REJECTED")}
          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-40"
        >
          {loading === "REJECTED" ? "Rejecting..." : "Reject"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
