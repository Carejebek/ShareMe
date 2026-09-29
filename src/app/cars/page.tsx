import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CarsPage() {
  const listings = await prisma.listing.findMany({
where: {
  isActive: true,
  approvalStatus: "APPROVED",
},
    orderBy: { createdAt: "desc" },
    include: {
      reviews: {
        select: { rating: true },
      },
    },
  });

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">
            JayXZ Marketplace
          </p>

          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-black text-neutral-950 md:text-5xl">
                Find Your Next Drive
              </h1>

              <p className="mt-3 text-lg text-neutral-600">
                Browse trusted vehicles available from local hosts.
              </p>
            </div>

            <Link
              href="/listings/new"
              className="rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-3 font-black text-white"
            >
              List Your Vehicle
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              placeholder="City or location"
              className="rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-[#ff5a1f]"
            />

            <input
              type="date"
              className="rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-[#ff5a1f]"
            />

            <input
              type="date"
              className="rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-[#ff5a1f]"
            />

            <select className="rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-[#ff5a1f]">
              <option>All vehicles</option>
              <option>SUV</option>
              <option>Luxury</option>
              <option>Electric</option>
              <option>Sports</option>
              <option>Truck</option>
            </select>

            <button className="rounded-xl bg-neutral-950 px-5 py-3 font-black text-white transition hover:bg-[#ff5a1f]">
              Search
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-20 text-center">
            <h2 className="text-3xl font-black text-neutral-950">
              No vehicles listed yet
            </h2>

            <p className="mt-4 text-neutral-600">
              Be the first host to list a vehicle on JayXZ.
            </p>

            <Link
              href="/listings/new"
              className="mt-8 inline-block rounded-xl bg-[#ff5a1f] px-7 py-4 font-black text-white"
            >
              List a Vehicle
            </Link>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => {
              const rating =
                listing.reviews.length > 0
                  ? (
                      listing.reviews.reduce(
                        (sum, review) => sum + review.rating,
                        0
                      ) / listing.reviews.length
                    ).toFixed(1)
                  : "New";

              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="group overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-2 hover:shadow-2xl"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-neutral-200">
                    <img
                      src={
                        listing.imageUrls[0] ||
                        "/images/shareme-hero.jpg"
                      }
                      alt={`${listing.make} ${listing.model}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-neutral-950">
                          {listing.make} {listing.model}
                        </h2>

                        <p className="mt-1 text-sm text-neutral-500">
                          {listing.year} · {listing.city}, {listing.state}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-black text-neutral-950">
                          ${Number(listing.pricePerDay).toFixed(0)}
                        </p>
                        <p className="text-xs text-neutral-500">per day</p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                      <span className="text-sm font-bold text-neutral-700">
                        ★ {rating}
                      </span>

                      <span className="text-sm font-black text-[#e62e1f]">
                        View vehicle →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
