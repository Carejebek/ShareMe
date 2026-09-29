const steps = [
  {
    number: "01",
    title: "Find your vehicle",
    text: "Search trusted vehicles by location, dates, category and price.",
  },
  {
    number: "02",
    title: "Book securely",
    text: "Choose the vehicle that fits your journey and complete your reservation online.",
  },
  {
    number: "03",
    title: "Drive your freedom",
    text: "Meet your host, collect the vehicle and enjoy your journey.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">
            Simple. Secure. Flexible.
          </p>

          <h2 className="mt-4 text-4xl font-black text-neutral-950 md:text-5xl">
            How JayXZ Works
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600">
            One digital marketplace connecting people who need vehicles with
            trusted owners who have vehicles available.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8 transition hover:-translate-y-2 hover:border-[#ff5a1f] hover:shadow-2xl"
            >
              <div className="text-5xl font-black text-[#ff5a1f]">
                {step.number}
              </div>

              <h3 className="mt-8 text-2xl font-black text-neutral-950">
                {step.title}
              </h3>

              <p className="mt-4 leading-7 text-neutral-600">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
