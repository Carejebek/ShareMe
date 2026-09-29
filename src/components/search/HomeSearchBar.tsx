"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeSearchBar() {
  const router = useRouter();

  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleSearch() {
    const params = new URLSearchParams();

    if (location.trim()) params.set("city", location.trim());
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    router.push(`/?${params.toString()}#featured-cars`);
  }

  return (
    <div className="absolute inset-x-0 bottom-8 z-20 px-6">
      <div className="mx-auto max-w-[1360px] rounded-3xl border border-white/20 bg-white p-3 shadow-2xl">
        <div className="grid items-center gap-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <label className="rounded-2xl px-5 py-3 transition hover:bg-neutral-50">
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
              Where
            </span>

            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Airport, hotel, address, city"
              className="mt-1 w-full bg-transparent text-base font-semibold text-neutral-950 outline-none placeholder:font-normal placeholder:text-neutral-400"
            />
          </label>

          <label className="border-neutral-200 rounded-2xl px-5 py-3 transition hover:bg-neutral-50 lg:border-l">
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
              From
            </span>

            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 w-full bg-transparent text-base font-semibold text-neutral-950 outline-none"
            />
          </label>

          <label className="border-neutral-200 rounded-2xl px-5 py-3 transition hover:bg-neutral-50 lg:border-l">
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
              Until
            </span>

            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full bg-transparent text-base font-semibold text-neutral-950 outline-none"
            />
          </label>

          <button
            type="button"
            onClick={handleSearch}
            className="h-full min-h-16 rounded-2xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-9 text-base font-black text-white shadow-lg shadow-red-950/25 transition hover:scale-[1.02]"
          >
            Search Cars
          </button>
        </div>
      </div>
    </div>
  );
}
