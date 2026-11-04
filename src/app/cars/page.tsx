import Link from "next/link";
import VehicleCard from "@/components/cards/VehicleCard";
import { CATEGORIES, carSearchWhere, carsHref, parseCarFilters, SORTS } from "@/lib/carSearch";
import { PUBLIC_LISTING_WHERE } from "@/lib/listingVisibility";
import { prisma } from "@/lib/prisma";
import { toVehicleCard } from "@/lib/vehicleCards";

// Render on every request so newly approved or removed cars show up immediately.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const field =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100";
const label = "mb-1.5 block text-xs font-black uppercase tracking-wider text-neutral-500";

export default async function CarsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = parseCarFilters(params);
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const where = carSearchWhere(filters);

  const [listings, total, makes] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: { reviews: { select: { rating: true } } },
      orderBy: SORTS[filters.sort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.listing.count({ where }),
    // Brands that actually have live cars, for the brand dropdown.
    prisma.listing.findMany({ where: PUBLIC_LISTING_WHERE, distinct: ["make"], select: { make: true }, orderBy: { make: "asc" } }),
  ]);

  const current = {
    where: filters.where,
    from: filters.from,
    until: filters.until,
    category: filters.category,
    make: filters.make,
    fuel: filters.fuel,
    seats: filters.seats,
    maxPrice: filters.maxPrice,
    sort: filters.sort,
  };
  const filtered = Object.entries(current).some(([key, value]) => key !== "sort" && value);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const today = new Date().toISOString().slice(0, 10);
  const datesChosen = filters.from && filters.until && !filters.dateError;

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 md:py-10">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">JayXZ Marketplace</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-black text-neutral-950 md:text-5xl">Find Your Next Drive</h1>
              <p className="mt-3 text-lg text-neutral-600">Browse trusted vehicles available from local hosts.</p>
            </div>
            <Link href="/listings/new" className="rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-3 font-black text-white">
              List Your Vehicle
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 bg-white">
        {/* Plain GET form: filters live in the URL, so searches can be shared and bookmarked. */}
        <form action="/cars" className="mx-auto max-w-7xl space-y-4 px-6 py-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
            <label className="col-span-2 md:col-span-1">
              <span className={label}>Where</span>
              <input name="where" defaultValue={filters.where} placeholder="City or state" className={field} />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className={label}>From</span>
              <input type="date" name="from" min={today} defaultValue={filters.from} className={field} />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className={label}>Until</span>
              <input type="date" name="until" min={today} defaultValue={filters.until} className={field} />
            </label>
            <label className="col-span-2 md:col-span-1">
              <span className={label}>Vehicle type</span>
              <select name="category" defaultValue={filters.category} className={field}>
                <option value="">All vehicles</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="col-span-2 rounded-xl bg-neutral-950 md:col-span-1 px-8 py-3 font-black text-white transition hover:bg-[#ff5a1f]">
              Search
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:items-end">
            <label>
              <span className={label}>Brand</span>
              <select name="make" defaultValue={filters.make} className={field}>
                <option value="">Any brand</option>
                {makes.map(({ make }) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
                {filters.make && !makes.some((m) => m.make.toLowerCase() === filters.make.toLowerCase()) && (
                  <option value={filters.make}>{filters.make}</option>
                )}
              </select>
            </label>
            <label>
              <span className={label}>Fuel</span>
              <select name="fuel" defaultValue={filters.fuel} className={field}>
                <option value="">Any fuel</option>
                <option value="ELECTRIC">Electric</option>
                <option value="HYBRID">Hybrid</option>
                <option value="GASOLINE">Gasoline</option>
                <option value="DIESEL">Diesel</option>
              </select>
            </label>
            <label>
              <span className={label}>Seats</span>
              <select name="seats" defaultValue={filters.seats ?? ""} className={field}>
                <option value="">Any</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
                <option value="7">7+</option>
              </select>
            </label>
            <label>
              <span className={label}>Max price / day</span>
              <input type="number" name="maxPrice" min={1} step={1} defaultValue={filters.maxPrice ?? ""} placeholder="Any" className={field} />
            </label>
            <label className="col-span-2 md:col-span-1">
              <span className={label}>Sort by</span>
              <select name="sort" defaultValue={filters.sort} className={field}>
                {Object.entries(SORTS).map(([value, s]) => (
                  <option key={value} value={value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {filters.dateError && (
          <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 font-bold text-red-700">{filters.dateError} Showing all dates instead.</p>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-neutral-700">
            {total} vehicle{total === 1 ? "" : "s"}
            {datesChosen ? ` available ${filters.from} to ${filters.until}` : ""}
          </p>
          {filtered && (
            <Link href="/cars" className="font-black text-[#e62e1f] hover:underline">
              Clear filters
            </Link>
          )}
        </div>

        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-20 text-center">
            <h2 className="text-3xl font-black text-neutral-950">{filtered ? "No vehicles match your search" : "No vehicles listed yet"}</h2>
            <p className="mt-4 text-neutral-600">
              {filtered ? "Try other dates, a nearby city or fewer filters." : "Be the first host to list a vehicle on JayXZ."}
            </p>
            <Link
              href={filtered ? "/cars" : "/listings/new"}
              className="mt-8 inline-block rounded-xl bg-[#ff5a1f] px-7 py-4 font-black text-white"
            >
              {filtered ? "See all vehicles" : "List a Vehicle"}
            </Link>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <VehicleCard key={listing.id} {...toVehicleCard(listing)} />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            {page > 1 && (
              <Link href={carsHref({ ...current, page: page - 1 })} className="rounded-xl bg-white px-5 py-3 font-bold shadow-sm hover:text-[#e62e1f]">
                ← Previous
              </Link>
            )}
            <span className="text-neutral-500">
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link href={carsHref({ ...current, page: page + 1 })} className="rounded-xl bg-white px-5 py-3 font-bold shadow-sm hover:text-[#e62e1f]">
                Next →
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
