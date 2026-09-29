import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HostDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const listings = await prisma.listing.findMany({
    where: {
      hostId: user.id,
    },
    include: {
      bookings: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalBookings = listings.reduce(
    (total, listing) => total + listing.bookings.length,
    0
  );

  const totalRevenue = listings.reduce((total, listing) => {
    return (
      total +
      listing.bookings.reduce(
        (bookingTotal, booking) =>
          bookingTotal + Number(booking.totalPrice),
        0
      )
    );
  }, 0);

  const activeListings = listings.filter(
    (listing) => listing.isActive
  ).length;

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#ff5a1f]">
              JayXZ Host
            </p>

            <h1 className="mt-3 text-4xl font-black text-neutral-950 md:text-5xl">
              Welcome, {user.name}
            </h1>

            <p className="mt-3 text-neutral-600">
              Manage your vehicles, bookings and earnings.
            </p>
          </div>

          <Link
            href="/listings/new"
            className="rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-4 font-black text-white"
          >
            + List New Vehicle
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl bg-neutral-950 p-7 text-white">
            <p className="text-sm text-neutral-400">
              Active Listings
            </p>

            <p className="mt-3 text-4xl font-black">
              {activeListings}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <p className="text-sm text-neutral-500">
              Total Bookings
            </p>

            <p className="mt-3 text-4xl font-black text-neutral-950">
              {totalBookings}
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] p-7 text-white">
            <p className="text-sm text-orange-100">
              Gross Booking Value
            </p>

            <p className="mt-3 text-4xl font-black">
              ${totalRevenue.toFixed(2)}
            </p>
          </div>
        </div>

        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-neutral-950">
              Your Vehicles
            </h2>

            <span className="text-sm font-bold text-neutral-500">
              {listings.length} total
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
              <h3 className="text-2xl font-black text-neutral-950">
                You haven't listed a vehicle yet
              </h3>

              <p className="mt-3 text-neutral-600">
                Add your first vehicle and start receiving booking requests.
              </p>

              <Link
                href="/listings/new"
                className="mt-7 inline-block rounded-xl bg-[#ff5a1f] px-7 py-4 font-black text-white"
              >
                List Your First Vehicle
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="overflow-hidden rounded-3xl bg-white shadow-sm"
                >
                  <div className="aspect-[16/10] bg-neutral-200">
                    <img
                      src={
                        listing.imageUrls[0] ||
                        "/images/shareme-hero.jpg"
                      }
                      alt={`${listing.make} ${listing.model}`}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black text-neutral-950">
                          {listing.make} {listing.model}
                        </h3>

                        <p className="mt-1 text-sm text-neutral-500">
                          {listing.year} · {listing.city}
                        </p>
                      </div>

                      <span
                        className={
                          listing.isActive
                            ? "rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700"
                            : "rounded-full bg-neutral-200 px-3 py-1 text-xs font-black text-neutral-600"
                        }
                      >
                        {listing.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-5">
                      <div>
                        <p className="text-xs text-neutral-500">
                          Daily rate
                        </p>

                        <p className="mt-1 font-black text-neutral-950">
                          ${Number(listing.pricePerDay).toFixed(0)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-neutral-500">
                          Bookings
                        </p>

                        <p className="mt-1 font-black text-neutral-950">
                          {listing.bookings.length}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/listings/${listing.id}`}
                      className="mt-6 block rounded-xl border border-neutral-300 px-5 py-3 text-center font-black text-neutral-900 transition hover:border-[#ff5a1f] hover:text-[#e62e1f]"
                    >
                      View Vehicle
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
