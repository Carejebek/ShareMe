"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import { calculateFare, type DistanceUnit, type RidePricing } from "@/lib/pricing";

// Sample trips for the preview: [label, minutes, kilometres]
const SAMPLES: [string, number, number][] = [
  ["Short hop", 8, 3],
  ["Across town", 20, 12],
  ["Airport run", 35, 25],
  ["Long trip", 60, 60],
];

type Values = Record<"baseFare" | "perMinute" | "perDistance" | "bookingFee" | "minimumFare", string> & { distanceUnit: DistanceUnit };

const FIELDS: { key: keyof Omit<Values, "distanceUnit">; label: string; hint: string }[] = [
  { key: "baseFare", label: "Base fare", hint: "Added to every ride." },
  { key: "perMinute", label: "Per minute", hint: "× Google's estimated drive time." },
  { key: "perDistance", label: "Per distance", hint: "× driving distance." },
  { key: "bookingFee", label: "Booking fee", hint: "Added on top, after the minimum." },
  { key: "minimumFare", label: "Minimum fare", hint: "Lowest fare before the booking fee." },
];

export default function RidePricingForm({ pricing, feePercent }: { pricing: RidePricing; feePercent: number }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    baseFare: String(pricing.baseFare),
    perMinute: String(pricing.perMinute),
    perDistance: String(pricing.perDistance),
    bookingFee: String(pricing.bookingFee),
    minimumFare: String(pricing.minimumFare),
    distanceUnit: pricing.distanceUnit,
  });
  const [custom, setCustom] = useState({ minutes: "15", km: "10" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const n = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) || Number(v) < 0 ? 0 : Number(v));
  const draft: RidePricing = useMemo(
    () => ({
      baseFare: n(values.baseFare),
      perMinute: n(values.perMinute),
      perDistance: n(values.perDistance),
      distanceUnit: values.distanceUnit,
      bookingFee: n(values.bookingFee),
      minimumFare: n(values.minimumFare),
      currency: pricing.currency,
    }),
    [values, pricing.currency]
  );
  const money = (v: number) => formatMoney(v, pricing.currency);
  const changed = (Object.keys(values) as (keyof Values)[]).some((k) => String(values[k]) !== String(pricing[k]));
  const unit = values.distanceUnit === "mi" ? "mile" : "km";

  const rows = [...SAMPLES, ["Your trip", n(custom.minutes), n(custom.km)] as [string, number, number]].map(([label, minutes, km]) => ({
    label,
    minutes,
    km,
    now: calculateFare(minutes * 60, km * 1000, pricing),
    next: calculateFare(minutes * 60, km * 1000, draft),
  }));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm("Save the new ride prices? Riders see them on their next quote. Rides already booked keep their price.")) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideBaseFare: n(values.baseFare),
          ridePerMinute: n(values.perMinute),
          ridePerDistance: n(values.perDistance),
          rideDistanceUnit: values.distanceUnit,
          rideBookingFee: n(values.bookingFee),
          rideMinimumFare: n(values.minimumFare),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Something went wrong.");
      setDone("Saved. New quotes use these prices.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-[13px] font-medium text-slate-700">
              {f.key === "perDistance" ? `Per ${unit}` : f.label} ({pricing.currency})
            </span>
            <input
              type="number"
              step="0.01"
              min={0}
              required
              value={values[f.key]}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className={input}
            />
            <span className="mt-1 block text-xs text-slate-500">{f.hint}</span>
          </label>
        ))}
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-slate-700">Distance unit</span>
          <select
            value={values.distanceUnit}
            onChange={(e) => setValues({ ...values, distanceUnit: e.target.value as DistanceUnit })}
            className={input}
          >
            <option value="km">Kilometres</option>
            <option value="mi">Miles</option>
          </select>
          <span className="mt-1 block text-xs text-slate-500">Currency is {pricing.currency} (set in .env).</span>
        </label>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-slate-800">
          What riders would pay {changed && <span className="font-normal text-amber-700">· unsaved changes</span>}
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Trip</th>
                <th className="px-3 py-2 font-medium">Time · distance</th>
                <th className="px-3 py-2 font-medium">Now</th>
                <th className="px-3 py-2 font-medium">New price</th>
                <th className="px-3 py-2 font-medium">Driver gets ({100 - feePercent}%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => {
                const last = i === rows.length - 1;
                const diff = Math.round((r.next.total - r.now.total) * 100) / 100;
                return (
                  <tr key={r.label}>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.label}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {last ? (
                        <span className="flex items-center gap-1.5">
                          <input
                            aria-label="Minutes"
                            type="number"
                            min={1}
                            value={custom.minutes}
                            onChange={(e) => setCustom({ ...custom, minutes: e.target.value })}
                            className="w-16 rounded border border-slate-300 px-1.5 py-1"
                          />
                          min ·
                          <input
                            aria-label="Kilometres"
                            type="number"
                            min={0}
                            step="0.1"
                            value={custom.km}
                            onChange={(e) => setCustom({ ...custom, km: e.target.value })}
                            className="w-16 rounded border border-slate-300 px-1.5 py-1"
                          />
                          km
                        </span>
                      ) : (
                        `${r.minutes} min · ${r.km} km${values.distanceUnit === "mi" ? ` (${r.next.distance} mi)` : ""}`
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{money(r.now.total)}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-slate-900">{money(r.next.total)}</span>
                      {diff !== 0 && (
                        <span className={`ml-1.5 text-xs ${diff > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                          {diff > 0 ? "+" : "−"}
                          {money(Math.abs(diff))}
                        </span>
                      )}
                      {r.next.minimumApplied && <span className="ml-1.5 text-xs text-slate-400">minimum</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{money(Math.round(r.next.total * (100 - feePercent)) / 100)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !changed}
          className="h-9 rounded-md bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save ride prices"}
        </button>
        {changed && (
          <button
            type="button"
            onClick={() =>
              setValues({
                baseFare: String(pricing.baseFare),
                perMinute: String(pricing.perMinute),
                perDistance: String(pricing.perDistance),
                bookingFee: String(pricing.bookingFee),
                minimumFare: String(pricing.minimumFare),
                distanceUnit: pricing.distanceUnit,
              })
            }
            className="text-[13px] font-medium text-slate-600 hover:text-slate-900"
          >
            Undo changes
          </button>
        )}
        {done && !error && <span className="text-[13px] font-medium text-emerald-700">{done}</span>}
        {error && <span className="text-[13px] font-medium text-rose-600">{error}</span>}
      </div>
    </form>
  );
}
