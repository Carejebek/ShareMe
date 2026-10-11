"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Existing = {
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  vehiclePlate: string;
  insuranceExpiresAt: string; // yyyy-mm-dd
} | null;

export default function DriverApplication({ existing }: { existing: Existing }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/driver", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Couldn't submit your application.");
      setMessage({ ok: true, text: "Submitted! We'll review it and let you know." });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100";
  const label = "mb-1.5 block text-sm font-bold text-neutral-800";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={label}>Car make</span>
          <input name="vehicleMake" required defaultValue={existing?.vehicleMake} placeholder="Toyota" className={input} />
        </label>
        <label>
          <span className={label}>Model</span>
          <input name="vehicleModel" required defaultValue={existing?.vehicleModel} placeholder="Camry" className={input} />
        </label>
        <label>
          <span className={label}>Year</span>
          <input name="vehicleYear" type="number" required min={new Date().getFullYear() - 25} max={new Date().getFullYear() + 1} defaultValue={existing?.vehicleYear} placeholder="2020" className={input} />
        </label>
        <label>
          <span className={label}>Colour</span>
          <input name="vehicleColor" required defaultValue={existing?.vehicleColor} placeholder="Silver" className={input} />
        </label>
        <label className="sm:col-span-2">
          <span className={label}>Licence plate</span>
          <input name="vehiclePlate" required defaultValue={existing?.vehiclePlate} placeholder="ABC 1234" className={`${input} uppercase`} />
          <span className="mt-1 block text-xs text-neutral-500">Riders see this so they get in the right car.</span>
        </label>
      </div>

      <div className="rounded-2xl bg-neutral-50 p-5">
        <p className="font-black text-neutral-950">Insurance</p>
        <p className="mt-1 text-sm text-neutral-600">
          A clear photo of your insurance card or certificate showing your name, this car and the expiry date.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className={label}>Photo {existing && <span className="font-normal text-neutral-500">(leave empty to keep the current one)</span>}</span>
            <input name="insurance" type="file" accept="image/jpeg,image/png,image/webp" required={!existing} className="block w-full text-sm" />
          </label>
          <label>
            <span className={label}>Expires on</span>
            <input name="insuranceExpiresAt" type="date" required min={today} defaultValue={existing?.insuranceExpiresAt} className={input} />
          </label>
        </div>
      </div>

      <button type="submit" disabled={busy} className="rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-8 py-4 font-black text-white disabled:opacity-50">
        {busy ? "Submitting…" : existing ? "Update and resubmit" : "Submit application"}
      </button>
      {existing && <p className="text-sm text-neutral-500">Changes are reviewed again before you can take rides.</p>}
      {message && <p className={`text-sm font-bold ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
    </form>
  );
}
