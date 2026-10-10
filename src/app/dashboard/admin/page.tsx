import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, StatCard, TextLink } from "@/components/admin/ui";
import { money, requireAdmin, shortDate } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getUnpaidBookings, owedFor } from "@/lib/payouts";
import { getPlatformFeePercent } from "@/lib/settings";

const DAY = 24 * 60 * 60 * 1000;

// What renters paid, minus anything refunded since.
async function revenueSince(since?: Date) {
  const result = await prisma.payment.aggregate({
    where: { status: { in: ["SUCCEEDED", "REFUNDED"] }, ...(since ? { createdAt: { gte: since } } : {}) },
    _sum: { amount: true, refundedAmount: true },
  });
  return Number(result._sum.amount ?? 0) - Number(result._sum.refundedAmount ?? 0);
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    revenueToday,
    revenue7,
    revenue30,
    revenueAll,
    rideRevenue,
    usersByRole,
    newUsers7,
    listingsLive,
    listingsTotal,
    bookingsByStatus,
    activeTrips,
    pendingVehicles,
    pendingBookings,
    failedPayments,
    openRides,
    latestBookings,
    latestUsers,
    pendingVerifications,
    openClaims,
    unpaidBookings,
    feePercent,
  ] = await Promise.all([
    revenueSince(startOfToday),
    revenueSince(new Date(now.getTime() - 7 * DAY)),
    revenueSince(new Date(now.getTime() - 30 * DAY)),
    revenueSince(),
    prisma.ride.aggregate({ where: { status: "COMPLETED", paid: true }, _sum: { totalPrice: true } }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
    prisma.listing.count({ where: { isActive: true, approvalStatus: "APPROVED" } }),
    prisma.listing.count(),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.booking.count({ where: { status: "CONFIRMED", startDate: { lte: now }, endDate: { gte: now } } }),
    prisma.listing.findMany({
      where: { approvalStatus: "PENDING" },
      include: { host: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.ride.count({ where: { status: "REQUESTED", driverId: null } }),
    prisma.booking.findMany({
      include: {
        listing: { select: { make: true, model: true, year: true } },
        renter: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.user.count({ where: { verificationStatus: "PENDING" } }),
    prisma.claim.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    getUnpaidBookings(),
    getPlatformFeePercent(),
  ]);
  const owedToHosts = owedFor(unpaidBookings, feePercent).host;

  const roleCount = (role: string) => usersByRole.find((r) => r.role === role)?._count._all ?? 0;
  const totalUsers = usersByRole.reduce((sum, r) => sum + r._count._all, 0);
  const bookingCount = (status: string) => bookingsByStatus.find((b) => b.status === status)?._count._all ?? 0;
  const totalBookings = bookingsByStatus.reduce((sum, b) => sum + b._count._all, 0);

  const attention = [
    { label: "Vehicles awaiting approval", count: pendingVehicles.length, href: "/dashboard/admin/vehicles?approval=PENDING" },
    { label: "Licences to verify", count: pendingVerifications, href: "/dashboard/admin/verifications" },
    { label: "Open claims", count: openClaims, href: "/dashboard/admin/claims?status=OPEN" },
    { label: "Unpaid / pending bookings", count: pendingBookings, href: "/dashboard/admin/bookings?status=PENDING" },
    { label: "Failed payments", count: failedPayments, href: "/dashboard/admin/payments?status=FAILED" },
    { label: "Rides without a driver", count: openRides, href: "/dashboard/admin/rides?status=REQUESTED" },
    { label: `Host payouts due (${money(owedToHosts)})`, count: unpaidBookings.length, href: "/dashboard/admin/payouts" },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform Overview"
        description="Revenue, marketplace health and everything that needs an admin."
        actions={
          <Link
            href="/cars"
            className="rounded-xl bg-neutral-950 px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff5a1f]"
          >
            View Marketplace
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="brand" label="Rental revenue · today" value={money(revenueToday)} />
        <StatCard label="Last 7 days" value={money(revenue7)} />
        <StatCard label="Last 30 days" value={money(revenue30)} />
        <StatCard
          tone="dark"
          label="All-time rental revenue"
          value={money(revenueAll)}
          hint={`+ ${money(rideRevenue._sum.totalPrice)} from paid rides`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={totalUsers}
          hint={`${roleCount("HOST")} hosts · ${roleCount("RENTER")} renters · ${roleCount("DRIVER")} drivers · +${newUsers7} this week`}
          href="/dashboard/admin/users"
        />
        <StatCard
          label="Live vehicles"
          value={listingsLive}
          hint={`${listingsTotal} listed in total`}
          href="/dashboard/admin/vehicles"
        />
        <StatCard
          label="Bookings"
          value={totalBookings}
          hint={`${bookingCount("CONFIRMED")} confirmed · ${bookingCount("COMPLETED")} completed · ${bookingCount("CANCELLED")} cancelled`}
          href="/dashboard/admin/bookings"
        />
        <StatCard
          label="Trips in progress"
          value={activeTrips}
          hint="Confirmed bookings happening right now"
          href="/dashboard/admin/bookings?status=CONFIRMED"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card title="Needs attention">
          {attention.length === 0 ? (
            <EmptyState>All clear — nothing waiting on an admin.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {attention.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded-2xl bg-orange-50 px-5 py-4 font-bold text-orange-900 transition hover:bg-orange-100"
                  >
                    {item.label}
                    <span className="rounded-full bg-[#ff5a1f] px-3 py-1 text-sm font-black text-white">{item.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {pendingVehicles.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-xs font-black uppercase tracking-wider text-neutral-400">Oldest pending vehicles</p>
              <ul className="space-y-2 text-sm">
                {pendingVehicles.map((listing) => (
                  <li key={listing.id} className="flex justify-between gap-3">
                    <TextLink href={`/dashboard/admin/vehicles/${listing.id}`}>
                      {listing.year} {listing.make} {listing.model}
                    </TextLink>
                    <span className="text-neutral-500">
                      {listing.host.name} · {shortDate(listing.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Latest bookings" action={<TextLink href="/dashboard/admin/bookings">View all →</TextLink>}>
          {latestBookings.length === 0 ? (
            <EmptyState>No bookings yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {latestBookings.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <TextLink href={`/dashboard/admin/bookings/${booking.id}`}>
                      {booking.listing.year} {booking.listing.make} {booking.listing.model}
                    </TextLink>
                    <p className="truncate text-neutral-500">
                      {booking.renter.name} · {shortDate(booking.startDate)} → {shortDate(booking.endDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-black">{money(booking.totalPrice)}</span>
                    <Badge value={booking.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Newest users" action={<TextLink href="/dashboard/admin/users">View all →</TextLink>}>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {latestUsers.map((user) => (
            <li key={user.id}>
              <Link
                href={`/dashboard/admin/users/${user.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-4 py-3 transition hover:bg-neutral-100"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{user.name}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {user.email} · {shortDate(user.createdAt)}
                  </p>
                </div>
                <Badge value={user.role} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
