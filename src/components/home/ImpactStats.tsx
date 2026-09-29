const stats = [
  { value: "24/7", label: "Digital access" },
  { value: "100%", label: "Online booking" },
  { value: "2-Way", label: "Renter & host marketplace" },
  { value: "1", label: "Connected mobility platform" },
];

export default function ImpactStats() {
  return (
    <section className="bg-neutral-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="border-l-4 border-[#ff5a1f] pl-6"
            >
              <div className="text-4xl font-black">{stat.value}</div>
              <div className="mt-2 text-sm font-medium text-neutral-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
