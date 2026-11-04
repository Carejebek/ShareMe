import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { describePricing } from "@/lib/pricing";
import { getRidePricing } from "@/lib/settings";

export default async function RidePromo() {
  const pricing = await getRidePricing();
  const steps = [
    ["Tell us where", "Use your current location or type a pickup, then choose where you're going."],
    ["See the price first", `${describePricing(pricing, (n) => formatMoney(n, pricing.currency))}, from your pickup to your destination.`],
    ["Ride", "A driver accepts your ride and you get updates by text. The price you booked is the price you pay."],
  ];

  return (
    <section className="bg-neutral-950 py-16 text-white md:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">JayXZ Rides</p>
          <h2 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
            Need a ride,
            <br />
            not a rental?
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-300">
            Book a driver in a minute. Your fare is calculated from Google&apos;s drive time and distance between your pickup and your
            destination, and locked in when you book.
          </p>
          <Link
            href="/ride"
            className="mt-9 inline-block rounded-xl bg-[#ff5a1f] px-8 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-[#e64a19]"
          >
            Book a ride
          </Link>
        </div>

        <ol className="grid gap-4">
          {steps.map(([title, text], index) => (
            <li key={title} className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 sm:gap-5 sm:p-6">
              <span className="text-3xl font-black text-[#ff5a1f]">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-2 text-neutral-400">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
