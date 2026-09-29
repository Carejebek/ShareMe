const brands = [
  "Mercedes-Benz",
  "BMW",
  "Tesla",
  "Porsche",
  "Audi",
  "Lexus",
  "Toyota",
  "Ford",
];

export default function BrowseBrands() {
  return (
    <section className="border-y border-neutral-200 bg-neutral-50 py-20">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#e62e1f]">
            Popular brands
          </p>

          <h2 className="mt-3 text-4xl font-black tracking-tight text-neutral-950 md:text-5xl">
            Browse by brand
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
          {brands.map((brand) => (
            <a
              key={brand}
              href={`/?make=${encodeURIComponent(brand)}#featured-cars`}
              className="flex min-h-28 items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 text-center text-base font-black text-neutral-900 shadow-sm transition hover:-translate-y-1 hover:border-[#ff5a1f] hover:text-[#e62e1f] hover:shadow-xl"
            >
              {brand}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
