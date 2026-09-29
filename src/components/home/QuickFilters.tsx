const filters = [
  { label: "All Cars", icon: "🚘", value: "" },
  { label: "Luxury", icon: "◆", value: "Luxury" },
  { label: "SUVs", icon: "🚙", value: "SUV" },
  { label: "Sports", icon: "🏎", value: "Sports" },
  { label: "Electric", icon: "⚡", value: "Electric" },
  { label: "Vans", icon: "🚐", value: "Van" },
  { label: "Trucks", icon: "🚚", value: "Truck" },
];

export default function QuickFilters() {
  return (
    <section className="border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-[1440px] overflow-x-auto px-6 py-7 lg:px-10">
        <div className="flex min-w-max items-center justify-center gap-3">
          {filters.map((filter, index) => (
            <a
              key={filter.label}
              href={
                filter.value
                  ? `/?category=${encodeURIComponent(filter.value)}#featured-cars`
                  : "/#featured-cars"
              }
              className={
                index === 0
                  ? "flex items-center gap-3 rounded-full bg-neutral-950 px-6 py-3 font-bold text-white"
                  : "flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-6 py-3 font-bold text-neutral-800 transition hover:border-[#ff5a1f] hover:bg-[#fff5f1] hover:text-[#e62e1f]"
              }
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
