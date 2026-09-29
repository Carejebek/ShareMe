import Link from "next/link";

export default function HostOpportunity() {
  return (
    <section className="bg-neutral-950 py-24 text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">
            Own a vehicle?
          </p>

          <h2 className="mt-5 text-5xl font-black leading-tight">
            Turn idle vehicles
            <br />
            into opportunity.
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-300">
            JayXZ gives individuals and fleet owners a digital marketplace to
            list available vehicles, manage bookings and create additional
            income from vehicles that would otherwise remain parked.
          </p>

          <Link
            href="/register"
            className="mt-9 inline-block rounded-xl bg-[#ff5a1f] px-8 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-[#e64a19]"
          >
            Become a Host
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
            <div className="text-3xl">🚗</div>
            <h3 className="mt-5 text-xl font-black">Vehicle Owners</h3>
            <p className="mt-3 text-neutral-400">
              Monetize underused vehicles.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
            <div className="text-3xl">🏢</div>
            <h3 className="mt-5 text-xl font-black">Fleet Operators</h3>
            <p className="mt-3 text-neutral-400">
              Digitize fleet availability and bookings.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
            <div className="text-3xl">🌍</div>
            <h3 className="mt-5 text-xl font-black">Travel & Tourism</h3>
            <p className="mt-3 text-neutral-400">
              Give visitors easier access to mobility.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
            <div className="text-3xl">💼</div>
            <h3 className="mt-5 text-xl font-black">Business Mobility</h3>
            <p className="mt-3 text-neutral-400">
              Expand transportation choices for organizations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
