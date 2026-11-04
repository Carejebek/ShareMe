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

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-28 pb-32 sm:pt-32 md:pb-24">
        <div className="max-w-3xl">

          <Link
            href="/waitlist"
            className="mb-8 inline-flex md:mb-10 items-center gap-3 rounded-full border-2 border-[#ff5a1f]/70 bg-white/10 px-5 py-3 text-sm font-black sm:px-6 sm:text-base text-white shadow-lg shadow-[#ff5a1f]/20 backdrop-blur transition hover:bg-[#ff5a1f] md:px-8 md:py-4 md:text-xl"
          >
            <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-[#ff5a1f] md:h-3.5 md:w-3.5" />
            Coming soon to more cities · Join the waitlist →
          </Link>

          <p className="uppercase tracking-[0.35em] text-[#ff5a1f] font-bold">
            JayXZ
          </p>

          <h1 className="mt-6 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-none text-white">
            Drive Your
            <br />
            Freedom.
          </h1>

          <p className="mt-6 text-lg text-gray-200 sm:mt-8 sm:text-xl max-w-2xl">
            Rent a car from trusted local owners, or book a ride with the
            price shown before you go.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 sm:mt-10 sm:gap-4">

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

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white sm:mt-12">
            <span>✓ Licence-verified hosts</span>
            <span>✓ Secure card payments</span>
            <span>✓ Upfront ride prices</span>
          </div>

        </div>
      </div>
    </section>
  );
}
