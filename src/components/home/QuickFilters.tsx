const filters = [
  { label: "All Cars", icon: "🚘", href: "/cars" },
  { label: "Economy", icon: "🚗", href: "/cars?category=ECONOMY" },
  { label: "Luxury", icon: "◆", href: "/cars?category=LUXURY" },
  { label: "SUVs", icon: "🚙", href: "/cars?category=SUV" },
  { label: "Sports", icon: "🏎", href: "/cars?category=SPORTS" },
  { label: "Electric", icon: "⚡", href: "/cars?fuel=ELECTRIC" },
  { label: "Vans", icon: "🚐", href: "/cars?category=VAN" },
  { label: "Trucks", icon: "🛻", href: "/cars?category=TRUCK" },
];

export default function QuickFilters() {
  return (
    <section className="border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-[1440px] overflow-x-auto px-6 py-7 lg:px-10">
        <div className="flex min-w-max items-center justify-center gap-3">
          {filters.map((filter, index) => (
            <a
              key={filter.label}
              href={filter.href}
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
