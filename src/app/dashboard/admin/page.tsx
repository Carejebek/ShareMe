import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const [
    users,
    listings,
    bookings,
    payments,
    latestListings,
    latestBookings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.booking.count(),
    prisma.payment.findMany({
      where: {
        status: "SUCCEEDED",
      },
      select: {
        amount: true,
      },
    }),
    prisma.listing.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      include: {
        host: true,
      },
    }),
    prisma.booking.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      include: {
        listing: true,
        renter: true,
      },
    }),
  ]);

  const grossRevenue = payments.reduce(
    (total, payment) => total + Number(payment.amount),
    0
  );

  const activeListings = await prisma.listing.count({
    where: {
      isActive: true,
    },
  });

  const hostCount = await prisma.user.count({
    where: {
      role: "HOST",
    },
  });

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">
              JayXZ Administration
            </p>

            <h1 className="mt-3 text-4xl font-black text-neutral-950 md:text-5xl">
              Platform Overview
            </h1>

            <p className="mt-3 text-neutral-600">
              Monitor marketplace activity, users, vehicles and bookings.
            </p>
          </div>

          <Link
            href="/cars"
            className="rounded-xl bg-neutral-950 px-6 py-4 font-black text-white transition hover:bg-[#ff5a1f]"
          >
            View Marketplace
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl bg-neutral-950 p-6 text-white">
            <p className="text-sm text-neutral-400">Total Users</p>
            <p className="mt-3 text-4xl font-black">{users}</p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-500">Hosts</p>
            <p className="mt-3 text-4xl font-black text-neutral-950">
              {hostCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-500">Active Vehicles</p>
            <p className="mt-3 text-4xl font-black text-neutral-950">
              {activeListings}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-500">Bookings</p>
            <p className="mt-3 text-4xl font-black text-neutral-950">
              {bookings}
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] p-6 text-white">
            <p className="text-sm text-orange-100">Processed Payments</p>
            <p className="mt-3 text-4xl font-black">
              ${grossRevenue.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-8 xl:grid-cols-2">
          <section className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#ff5a1f]">
                  Marketplace
                </p>

                <h2 className="mt-2 text-2xl font-black text-neutral-950">
                  Latest Vehicles
                </h2>
              </div>

              <span className="text-sm font-bold text-neutral-500">
                {listings} total
              </span>
            </div>

            {latestListings.length === 0 ? (
              <p className="mt-8 text-neutral-500">
                No vehicles have been listed yet.
              </p>
            ) : (
              <div className="mt-7 space-y-4">
                {latestListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 p-4"
                  >
                    <div>
                      <p className="font-black text-neutral-950">
                        {listing.make} {listing.model}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        {listing.year} · {listing.city}, {listing.state}
                      </p>

                      <p className="mt-1 text-xs text-neutral-400">
                        Host: {listing.host.name}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-neutral-950">
                        ${Number(listing.pricePerDay).toFixed(0)}/day
                      </p>

                      <span
                        className={
                          listing.isActive
                            ? "mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700"
                            : "mt-2 inline-block rounded-full bg-neutral-200 px-3 py-1 text-xs font-black text-neutral-600"
                        }
                      >
                        {listing.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#ff5a1f]">
                  Transactions
                </p>

                <h2 className="mt-2 text-2xl font-black text-neutral-950">
                  Latest Bookings
                </h2>
              </div>
            </div>

            {latestBookings.length === 0 ? (
              <p className="mt-8 text-neutral-500">
                No bookings have been created yet.
              </p>
            ) : (
              <div className="mt-7 space-y-4">
                {latestBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl bg-neutral-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-neutral-950">
                          {booking.listing.make} {booking.listing.model}
                        </p>

                        <p className="mt-1 text-sm text-neutral-500">
                          Renter: {booking.renter.name}
                        </p>
                      </div>

                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-[#e62e1f]">
                        {booking.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
                      <span className="text-sm text-neutral-500">
                        {new Date(booking.startDate).toLocaleDateString()} →{" "}
                        {new Date(booking.endDate).toLocaleDateString()}
                      </span>

                      <span className="font-black text-neutral-950">
                        ${Number(booking.totalPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-8 rounded-3xl bg-neutral-950 p-8 text-white">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#ff5a1f]">
            JayXZ Vision
          </p>

          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <h2 className="text-3xl font-black md:text-4xl">
                A connected digital mobility marketplace.
              </h2>

              <p className="mt-5 max-w-3xl leading-8 text-neutral-300">
                JayXZ is designed to connect vehicle owners, renters,
                fleet operators, businesses and travelers through one
                secure digital platform.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="font-black text-white">
                Drive Your Freedom.
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Built by OAJ Software.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
