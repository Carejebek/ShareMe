"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AddressInput, { type PickedAddress } from "@/components/ride/AddressInput";
import { CATEGORIES } from "@/lib/categories";

// The homepage search: rent a car (goes to /cars with filters) or book a ride (goes to /ride with both addresses filled in).
export default function SearchBar() {
  const router = useRouter();
  const [mode, setMode] = useState<"rent" | "ride">("rent");
  const [pickup, setPickup] = useState<PickedAddress | null>(null);
  const [dropoff, setDropoff] = useState<PickedAddress | null>(null);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  function searchCars(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const from = String(data.get("from") || "");
    const until = String(data.get("until") || "");
    if (from && until && until <= from) {
      setError("The return date must be after the pick-up date.");
      return;
    }
    if ((from && !until) || (!from && until)) {
      setError("Choose both a pick-up and a return date, or neither.");
      return;
    }
    setError("");
    const query = new URLSearchParams();
    for (const key of ["where", "from", "until", "category"]) {
      const value = String(data.get(key) || "").trim();
      if (value) query.set(key, value);
    }
    router.push(query.size ? `/cars?${query}` : "/cars");
  }

  function bookRide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (pickup) {
      query.set("pu", pickup.placeId);
      query.set("pua", pickup.address);
    }
    if (dropoff) {
      query.set("do", dropoff.placeId);
      query.set("doa", dropoff.address);
    }
    router.push(query.size ? `/ride?${query}` : "/ride");
  }

  const tab = (value: "rent" | "ride", text: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(value);
        setError("");
      }}
      className={`rounded-full px-5 py-2 text-sm font-black transition ${
        mode === value ? "bg-neutral-950 text-white" : "text-neutral-600 hover:text-neutral-950"
      }`}
      aria-pressed={mode === value}
    >
      {text}
    </button>
  );

  const cell = "block p-5 md:border-r md:border-neutral-100";
  const caption = "text-xs font-bold uppercase text-gray-500";

  return (
    <div className="relative z-30 mx-auto -mt-24 max-w-7xl px-6">
      <div className="mb-3 inline-flex gap-1 rounded-full bg-white p-1 shadow-xl">
        {tab("rent", "Rent a car")}
        {tab("ride", "Book a ride")}
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-2xl">
        {mode === "rent" ? (
          <form onSubmit={searchCars} className="grid grid-cols-1 md:grid-cols-5">
            <label className={cell}>
              <span className={caption}>Where</span>
              <input name="where" placeholder="City or state" className="mt-2 w-full text-lg outline-none" />
            </label>
            <label className={cell}>
              <span className={caption}>From</span>
              <input type="date" name="from" min={today} className="mt-2 w-full outline-none" />
            </label>
            <label className={cell}>
              <span className={caption}>Until</span>
              <input type="date" name="until" min={today} className="mt-2 w-full outline-none" />
            </label>
            <label className={cell}>
              <span className={caption}>Vehicle</span>
              <select name="category" className="mt-2 w-full bg-transparent outline-none">
                <option value="">All vehicles</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-b-3xl bg-[#ff5a1f] py-5 text-xl font-bold text-white transition hover:bg-[#e64a19] md:rounded-b-none md:rounded-r-3xl"
            >
              Search cars
            </button>
          </form>
        ) : (
          <form onSubmit={bookRide} className="grid grid-cols-1 items-end gap-4 p-5 md:grid-cols-[1fr_1fr_auto]">
            <AddressInput label="Pickup" placeholder="Where are you?" value={pickup} onChange={setPickup} allowCurrentLocation />
            <AddressInput label="Drop-off" placeholder="Where are you going?" value={dropoff} onChange={setDropoff} />
            <button
              type="submit"
              className="self-start rounded-xl bg-[#ff5a1f] px-8 py-3 text-lg font-bold text-white transition hover:bg-[#e64a19] md:mt-6"
            >
              See price
            </button>
          </form>
        )}
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</p>}
    </div>
  );
}
