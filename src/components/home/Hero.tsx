import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/shareme-hero.jpg')",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-32 pb-24">
        <div className="max-w-3xl">

          <a
            href="#waitlist"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff5a1f]" />
            Coming soon to more cities · Join the waitlist →
          </a>

          <p className="uppercase tracking-[0.35em] text-[#ff5a1f] font-bold">
            JayXZ
          </p>

          <h1 className="mt-6 text-6xl md:text-7xl lg:text-8xl font-black leading-none text-white">
            Drive Your
            <br />
            Freedom.
          </h1>

          <p className="mt-8 text-xl text-gray-200 max-w-2xl">
            Rent a car from trusted local owners, or book a ride with the
            price shown before you go.
          </p>

          <div className="mt-10 flex gap-4 flex-wrap">

            <Link
              href="/cars"
              className="rounded-xl bg-[#ff5a1f] px-8 py-4 text-white font-bold hover:opacity-90"
            >
              Browse Cars
            </Link>

            <Link
              href="/register"
              className="rounded-xl border border-white px-8 py-4 text-white font-bold hover:bg-white hover:text-black transition"
            >
              Become a Host
            </Link>

          </div>

          <div className="mt-12 flex gap-8 text-white text-sm flex-wrap">
            <span>✓ Licence-verified hosts</span>
            <span>✓ Secure card payments</span>
            <span>✓ Upfront ride prices</span>
          </div>

        </div>
      </div>
    </section>
  );
}
