"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CLAIM_TYPE_LABEL } from "@/lib/claims";

export default function ReportIssueForm({
  bookings,
  defaultBookingId,
}: {
  bookings: { id: string; label: string }[];
  defaultBookingId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      // Upload photos first (if any), then file the claim with their URLs.
      let imageUrls: string[] = [];
      const photos = data.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
      if (photos.length) {
        const upload = new FormData();
        photos.forEach((p) => upload.append("files", p));
        const res = await fetch("/api/uploads", { method: "POST", body: upload });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || "Photo upload failed.");
        imageUrls = result.urls;
      }

      const amount = String(data.get("amountRequested") ?? "").trim();
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: data.get("bookingId"),
          type: data.get("type"),
          description: data.get("description"),
          amountRequested: amount ? Number(amount) : null,
          imageUrls,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Couldn't file the claim.");
      form.reset();
      setSent(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-[#ff5a1f]";
  const label = "mb-1.5 block text-xs font-black uppercase tracking-wider text-neutral-500";

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className={label}>Trip</span>
        <select name="bookingId" required defaultValue={defaultBookingId} className={input}>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={label}>What kind of issue?</span>
        <select name="type" required className={input}>
          {Object.entries(CLAIM_TYPE_LABEL).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={label}>What happened?</span>
        <textarea name="description" required minLength={10} rows={5} className={input} placeholder="Describe the problem, when and where it happened." />
      </label>
      <label className="block">
        <span className={label}>Amount you&apos;re asking for (optional, USD)</span>
        <input type="number" name="amountRequested" min={0} step="0.01" className={input} />
      </label>
      <label className="block">
        <span className={label}>Photos (optional, up to 8)</span>
        <input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-3 font-black text-white disabled:opacity-50"
      >
        {busy ? "Sending…" : "Submit claim"}
      </button>
      {sent && !error && <p className="text-sm font-bold text-green-700">Claim submitted. We&apos;ll review it and update you here.</p>}
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
    </form>
  );
}
