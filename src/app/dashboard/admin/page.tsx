import Link from "next/link";
import RevenueChart from "@/components/admin/RevenueChart";
import { Icon, type IconName } from "@/components/admin/icons";
import { Badge, Card, EmptyState, PageHeader, SegmentBar, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { dateTime, money, requireAdmin, shortDate } from "@/lib/admin";
import { AUDIT_LABELS, TARGET_HREF } from "@/lib/audit";
import { PUBLIC_LISTING_WHERE } from "@/lib/listingVisibility";
import { prisma } from "@/lib/prisma";
import { getUnpaidBookings, getUnpaidRides, owedFor, owedForRides } from "@/lib/payouts";
import { getPlatformFeePercent } from "@/lib/settings";

const DAY = 24 * 60 * 60 * 1000;
const PAID = { status: { in: ["SUCCEEDED", "REFUNDED"] as ("SUCCEEDED" | "REFUNDED")[] } };

// What renters paid, minus anything refunded since.
async function revenueBetween(from?: Date, to?: Date) {
  const result = await prisma.payment.aggregate({
    where: { ...PAID, createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } },
    _sum: { amount: true, refundedAmount: true },
  });
  return Number(result._sum.amount ?? 0) - Number(result._sum.refundedAmount ?? 0);
}

// Percentage change, or null when there's nothing to compare against.
function change(current: number, previous: number) {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export default async function AdminOverviewPage() {
  const admin = await requireAdmin();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const chartStart = new Date(startOfToday.getTime() - 29 * DAY);
  const last30 = new Date(now.getTime() - 30 * DAY);
  const prev30 = new Date(now.getTime() - 60 * DAY);

  const [
    revenueToday,
    revenue30,
    revenuePrev30,
    revenueAll,
    rideRevenue,
    chartPayments,
    usersByRole,
    newUsers30,
    newUsersPrev30,
    listingsLive,
    listingsTotal,
    bookingsByStatus,
    bookings30,
    bookingsPrev30,
    activeTrips,
    pendingVehicles,
    pendingBookings,
    failedPayments,
    openRides,
    pendingVerifications,
    openClaims,
    latestBookings,
    activity,
    unpaidBookings,
    feePercent,
    pendingDrivers,
    unpaidRides,
    insuranceSoon,
  ] = await Promise.all([
    revenueBetween(startOfToday),
    revenueBetween(last30),
    revenueBetween(prev30, last30),
    revenueBetween(),
    prisma.ride.aggregate({ where: { status: "COMPLETED", paid: true }, _sum: { totalPrice: true, refundedAmount: true } }),
    prisma.payment.findMany({
      where: { ...PAID, createdAt: { gte: chartStart } },
      select: { amount: true, refundedAmount: true, createdAt: true },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { createdAt: { gte: last30 } } }),
    prisma.user.count({ where: { createdAt: { gte: prev30, lt: last30 } } }),
    prisma.listing.count({ where: PUBLIC_LISTING_WHERE }),
    prisma.listing.count(),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.booking.count({ where: { createdAt: { gte: last30 } } }),
    prisma.booking.count({ where: { createdAt: { gte: prev30, lt: last30 } } }),
    prisma.booking.count({ where: { status: "CONFIRMED", startDate: { lte: now }, endDate: { gte: now } } }),
    prisma.listing.count({ where: { approvalStatus: "PENDING" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.ride.count({ where: { status: "REQUESTED", driverId: null } }),
    prisma.user.count({ where: { verificationStatus: "PENDING" } }),
    prisma.claim.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.booking.findMany({
      include: {
        listing: { select: { make: true, model: true, year: true } },
        renter: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.auditLog.findMany({
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    getUnpaidBookings(),
    getPlatformFeePercent(),
    prisma.driverProfile.count({ where: { status: "PENDING" } }),
    getUnpaidRides(),
    // Approved drivers whose insurance has lapsed or lapses within a week.
    prisma.driverProfile.count({ where: { status: "APPROVED", insuranceExpiresAt: { lt: new Date(now.getTime() + 7 * DAY) } } }),
  ]);
  const owedToHosts = owedFor(unpaidBookings, feePercent).host + owedForRides(unpaidRides).host;

  // Bucket the last 30 days of payments by calendar day for the chart.
  const days = Array.from({ length: 30 }, (_, i) => ({ date: new Date(chartStart.getTime() + i * DAY), amount: 0 }));
  for (const p of chartPayments) {
    const index = Math.floor((p.createdAt.getTime() - chartStart.getTime()) / DAY);
    if (days[index]) days[index].amount += Number(p.amount) - Number(p.refundedAmount);
  }

  const roleCount = (role: string) => usersByRole.find((r) => r.role === role)?._count._all ?? 0;
  const totalUsers = usersByRole.reduce((sum, r) => sum + r._count._all, 0);
  const bookingCount = (status: string) => bookingsByStatus.find((b) => b.status === status)?._count._all ?? 0;

  const queue: { label: string; detail: string; count: number; href: string; icon: IconName }[] = [
    { label: "Vehicles awaiting approval", detail: "New listings to review", count: pendingVehicles, href: "/dashboard/admin/vehicles?approval=PENDING", icon: "car" },
    { label: "Licences to verify", detail: "Hosts waiting on verification", count: pendingVerifications, href: "/dashboard/admin/verifications", icon: "shield" },
    { label: "Open claims", detail: "Damage and incident reports", count: openClaims, href: "/dashboard/admin/claims?status=OPEN", icon: "alert" },
    { label: "Failed payments", detail: "Checkout attempts that failed", count: failedPayments, href: "/dashboard/admin/payments?status=FAILED", icon: "card" },
    { label: "Rides without a driver", detail: "Requested, not yet assigned", count: openRides, href: "/dashboard/admin/rides?status=REQUESTED", icon: "route" },
    { label: "Driver applications", detail: "New drivers waiting for review", count: pendingDrivers, href: "/dashboard/admin/drivers?status=PENDING", icon: "route" },
    { label: "Driver insurance expiring", detail: "Expired or expiring within 7 days", count: insuranceSoon, href: "/dashboard/admin/drivers#insurance", icon: "shield" },
    { label: "Payouts due", detail: `${money(owedToHosts)} owed to hosts and drivers`, count: unpaidBookings.length + unpaidRides.length, href: "/dashboard/admin/payouts", icon: "wallet" },
    { label: "Pending bookings", detail: "Awaiting payment or confirmation", count: pendingBookings, href: "/dashboard/admin/bookings?status=PENDING", icon: "calendar" },
  ];
  const attention = queue.filter((item) => item.count > 0);

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${admin.name.split(" ")[0]}`}
        description={`Here's how the marketplace is doing · ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
        actions={
          <Link
            href="/cars"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Icon name="external" className="h-3.5 w-3.5" /> View marketplace
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="brand" icon="card" label="Net revenue · 30 days" value={money(revenue30)} delta={change(revenue30, revenuePrev30)} hint={`${money(revenueToday)} today`} />
        <StatCard icon="calendar" label="Bookings · 30 days" value={bookings30} delta={change(bookings30, bookingsPrev30)} hint={`${activeTrips} trips in progress now`} href="/dashboard/admin/bookings" />
        <StatCard icon="users" label="New users · 30 days" value={newUsers30} delta={change(newUsers30, newUsersPrev30)} hint={`${totalUsers} users in total`} href="/dashboard/admin/users" />
        <StatCard icon="car" label="Live vehicles" value={listingsLive} hint={`${listingsTotal} listed in total`} href="/dashboard/admin/vehicles" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Net revenue"
          description="Rental payments by day, last 30 days, after refunds"
          action={
            <div className="text-right">
              <p className="text-xs text-slate-500">All time</p>
              <p className="font-semibold tabular-nums text-slate-900">{money(revenueAll)}</p>
            </div>
          }
        >
          <RevenueChart days={days} />
          <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-4 text-[13px]">
            <div className="pr-4">
              <p className="text-xs text-slate-500">Paid ride revenue</p>
              <p className="mt-0.5 font-semibold tabular-nums">{money(Number(rideRevenue._sum.totalPrice ?? 0) - Number(rideRevenue._sum.refundedAmount ?? 0))}</p>
            </div>
            <div className="px-4">
              <p className="text-xs text-slate-500">Owed to hosts &amp; drivers</p>
              <p className="mt-0.5 font-semibold tabular-nums">{money(owedToHosts)}</p>
            </div>
            <div className="pl-4">
              <p className="text-xs text-slate-500">Platform fee</p>
              <p className="mt-0.5 font-semibold tabular-nums">{feePercent}%</p>
            </div>
          </div>
        </Card>

        <Card title="Action queue" description={attention.length ? `${attention.length} areas need an admin` : undefined}>
          {attention.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-[13px] text-slate-500">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" className="h-5 w-5" />
              </span>
              All clear — nothing is waiting on an admin.
            </div>
          ) : (
            <ul className="-mx-5 -my-4 divide-y divide-slate-100">
              {attention.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      <Icon name={item.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-slate-900">{item.label}</span>
                      <span className="block truncate text-xs text-slate-500">{item.detail}</span>
                    </span>
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-800 ring-1 ring-inset ring-amber-600/20">
                      {item.count}
                    </span>
                    <Icon name="chevronRight" className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Card title="Bookings by status" action={<TextLink href="/dashboard/admin/bookings">View all</TextLink>}>
          <SegmentBar
            segments={[
              { label: "Pending", value: bookingCount("PENDING"), className: "bg-amber-400" },
              { label: "Confirmed", value: bookingCount("CONFIRMED"), className: "bg-blue-500" },
              { label: "Completed", value: bookingCount("COMPLETED"), className: "bg-emerald-500" },
              { label: "Cancelled", value: bookingCount("CANCELLED"), className: "bg-slate-300" },
            ]}
          />
        </Card>
        <Card title="Users by role" action={<TextLink href="/dashboard/admin/users">View all</TextLink>}>
          <SegmentBar
            segments={[
              { label: "Renters", value: roleCount("RENTER"), className: "bg-sky-500" },
              { label: "Hosts", value: roleCount("HOST"), className: "bg-orange-500" },
              { label: "Drivers", value: roleCount("DRIVER"), className: "bg-indigo-500" },
              { label: "Admins", value: roleCount("ADMIN"), className: "bg-slate-800" },
            ]}
          />
        </Card>
        <Card title="Recent admin activity" action={<TextLink href="/dashboard/admin/audit">Audit log</TextLink>}>
          {activity.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-slate-500">No admin actions yet.</p>
          ) : (
            <ul className="space-y-2.5 text-[13px]">
              {activity.slice(0, 5).map((entry) => {
                const href = TARGET_HREF[entry.targetType]?.(entry.targetId);
                const label = AUDIT_LABELS[entry.action] ?? entry.action;
                return (
                  <li key={entry.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">
                        {href ? <TextLink href={href}>{label}</TextLink> : label}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{entry.admin?.name ?? "Deleted admin"}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400" title={dateTime(entry.createdAt)}>
                      {shortDate(entry.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Latest bookings" action={<TextLink href="/dashboard/admin/bookings">View all</TextLink>}>
        {latestBookings.length === 0 ? (
          <EmptyState>No bookings yet.</EmptyState>
        ) : (
          <Table head={["Vehicle", "Renter", "Trip dates", "Total", "Status", "Booked"]}>
            {latestBookings.map((booking) => (
              <tr key={booking.id}>
                <Td>
                  <TextLink href={`/dashboard/admin/bookings/${booking.id}`}>
                    {booking.listing.year} {booking.listing.make} {booking.listing.model}
                  </TextLink>
                </Td>
                <Td>
                  <TextLink href={`/dashboard/admin/users/${booking.renter.id}`}>{booking.renter.name}</TextLink>
                </Td>
                <Td className="whitespace-nowrap text-slate-500">
                  {shortDate(booking.startDate)} – {shortDate(booking.endDate)}
                </Td>
                <Td className="font-medium tabular-nums text-slate-900">{money(booking.totalPrice)}</Td>
                <Td>
                  <Badge value={booking.status} />
                </Td>
                <Td className="whitespace-nowrap text-slate-500">{shortDate(booking.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
