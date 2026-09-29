import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ListingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      host: true,
      reviews: {
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!listing || !listing.isActive) {
    notFound();
  }

  const averageRating =
    listing.reviews.length > 0
      ? (
          listing.reviews.reduce((sum, review) => sum + review.rating, 0) /
          listing.reviews.length
        ).toFixed(1)
      : "New";

  const images =
    listing.imageUrls.length > 0
      ? listing.imageUrls
      : ["/images/shareme-hero.jpg"];

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <Link
          href="/cars"
          className="text-sm font-bold text-neutral-600 hover:text-[#ff5a1f]"
        >
          ← Back to vehicles
        </Link>

        <div className="mt-6">
          <h1 className="text-4xl font-black text-neutral-950 md:text-5xl">
            {listing.make} {listing.model}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            <span>{listing.year}</span>
            <span>•</span>
            <span>
              {listing.city}, {listing.state}
            </span>
            <span>•</span>
            <span>★ {averageRating}</span>
            <span>•</span>
            <span>{listing.reviews.length} reviews</span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl bg-neutral-200">
            <img
              src={images[0]}
              alt={`${listing.make} ${listing.model}`}
              className="h-full min-h-[420px] w-full object-cover"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {images.slice(1, 5).map((image, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-3xl bg-neutral-200"
              >
                <img
                  src={image}
                  alt={`${listing.make} ${listing.model}`}
                  className="h-full min-h-[200px] w-full object-cover"
                />
              </div>
            ))}

            {images.length === 1 && (
              <>
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="flex min-h-[200px] items-center justify-center rounded-3xl bg-neutral-200 text-neutral-400"
                  >
                    JayXZ
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <section className="rounded-3xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-black text-neutral-950">
                About this vehicle
              </h2>

              <p className="mt-5 leading-8 text-neutral-600">
                {listing.description}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="rounded-2xl bg-neutral-50 p-5">
                  <p className="text-sm text-neutral-500">Seats</p>
                  <p className="mt-1 font-black text-neutral-950">
                    {listing.seats}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-5">
                  <p className="text-sm text-neutral-500">Transmission</p>
                  <p className="mt-1 font-black text-neutral-950">
                    {listing.transmission}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-5">
                  <p className="text-sm text-neutral-500">Fuel type</p>
                  <p className="mt-1 font-black text-neutral-950">
                    {listing.fuelType}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[#ff5a1f]">
                Your host
              </p>

              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-950 text-xl font-black text-white">
                  {listing.host.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <h3 className="text-xl font-black text-neutral-950">
                    {listing.host.name}
                  </h3>

                  <p className="mt-1 text-sm text-neutral-500">
                    JayXZ verified host
                  </p>
                </div>
              </div>

              {listing.host.bio && (
                <p className="mt-5 leading-7 text-neutral-600">
                  {listing.host.bio}
                </p>
              )}
            </section>

            <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-black text-neutral-950">
                Guest reviews
              </h2>

              {listing.reviews.length === 0 ? (
                <p className="mt-5 text-neutral-600">
                  This vehicle has not received any reviews yet.
                </p>
              ) : (
                <div className="mt-6 space-y-6">
                  {listing.reviews.slice(0, 5).map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-neutral-100 pb-6 last:border-none"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-black text-neutral-950">
                          {review.author.name}
                        </p>

                        <p className="font-bold text-[#ff5a1f]">
                          ★ {review.rating}
                        </p>
                      </div>

                      {review.comment && (
                        <p className="mt-3 leading-7 text-neutral-600">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl bg-white p-7 shadow-xl">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-black text-neutral-950">
                    ${Number(listing.pricePerDay).toFixed(0)}
                  </p>
                  <p className="text-sm text-neutral-500">per day</p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-neutral-950">
                    ★ {averageRating}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {listing.reviews.length} reviews
                  </p>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-neutral-700">
                    Pickup date
                  </label>

                  <input
                    type="date"
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-[#ff5a1f]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-neutral-700">
                    Return date
                  </label>

                  <input
                    type="date"
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-[#ff5a1f]"
                  />
                </div>
              </div>

              <Link
                href={`/book/${listing.id}`}
                className="mt-7 block w-full rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-4 text-center font-black text-white shadow-lg shadow-red-950/20 transition hover:-translate-y-0.5"
              >
                Reserve Vehicle
              </Link>

              <p className="mt-4 text-center text-xs leading-5 text-neutral-500">
                You will review your trip details before payment.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
