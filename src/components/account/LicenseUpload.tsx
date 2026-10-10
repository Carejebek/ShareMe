"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LicenseUpload({ resubmit }: { resubmit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/verification", { method: "POST", body: new FormData(event.currentTarget) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        type="file"
        name="license"
        accept="image/jpeg,image/png,image/webp"
        required
        className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-neutral-950 file:px-5 file:py-3 file:font-bold file:text-white"
      />
      <p className="text-xs text-neutral-500">
        A clear photo of the front of your licence (JPG, PNG or WEBP, up to 10 MB). Only JayXZ admins can see it.
      </p>
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-3 font-black text-white disabled:opacity-50"
      >
        {busy ? "Uploading…" : resubmit ? "Upload a new photo" : "Submit for verification"}
      </button>
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
    </form>
  );
}
