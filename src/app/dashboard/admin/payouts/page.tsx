import AdminForm from "@/components/admin/AdminForm";
import { Icon } from "@/components/admin/icons";
import { Badge, EmptyState, PageHeader, SectionTitle, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { dateTime, money, requireAdmin, shortDate } from "@/lib/admin";
import { getUnpaidBookings, getUnpaidRides, owedFor, owedForRides } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import { getPlatformFeePercent, splitEarnings } from "@/lib/settings";

type Payee = {
  id: string;
  name: string;
  email: string;
  bookings: Awaited<ReturnType<typeof getUnpaidBookings>>;
  rides: Awaited<ReturnType<typeof getUnpaidRides>>;
};

export default async function AdminPayoutsPage() {
  await requireAdmin();

  const [unpaid, unpaidRides, feePercent, history, paidBookings, paidRides] = await Promise.all([
    getUnpaidBookings(),
    getUnpaidRides(),
    getPlatformFeePercent(),
    prisma.payout.findMany({
      include: {
        host: { select: { id: true, name: true } },
        admin: { select: { name: true } },
        _count: { select: { bookings: true, rides: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.booking.aggregate({ where: { payoutId: { not: null } }, _sum: { hostEarnings: true, platformFee: true } }),
    prisma.ride.aggregate({ where: { payoutId: { not: null } }, _sum: { driverEarnings: true, platformFee: true } }),
  ]);

  // Group everything owed by the person being paid (hosts for trips, drivers for rides).
  const byPayee = new Map<string, Payee>();
  const payee = (p: { id: string; name: string; email: string }) => {
    const entry = byPayee.get(p.id) ?? { ...p, bookings: [], rides: [] };
    byPayee.set(p.id, entry);
    return entry;
  };
  for (const booking of unpaid) payee(booking.listing.host).bookings.push(booking);
  for (const ride of unpaidRides) if (ride.driver) payee(ride.driver).rides.push(ride);
  const payees = [...byPayee.values()];

  const owedTrips = owedFor(unpaid, feePercent);
  const owedRides = owedForRides(unpaidRides);
  const owedTotal = owedTrips.host + owedRides.host;
  const feeTotal = owedTrips.fee + owedRides.fee;
  const paidOut = Number(paidBookings._sum.hostEarnings ?? 0) + Number(paidRides._sum.driverEarnings ?? 0);
  const feesEarned = Number(paidBookings._sum.platformFee ?? 0) + Number(paidRides._sum.platformFee ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        description={`Hosts are owed ${100 - feePercent}% of what the renter paid (after refunds) for each completed trip. Drivers are owed their share of each ride charged to the rider's card. Pay them yourself, then record it here.`}
        actions={<TextLink href="/dashboard/admin/settings">Platform fee: {feePercent}% →</TextLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone={owedTotal ? "warn" : "light"}
          label="Owed now"
          value={money(owedTotal)}
          hint={`${unpaid.length} trips and ${unpaidRides.length} rides across ${payees.length} people`}
        />
        <StatCard label="Platform fee on those" value={money(feeTotal)} />
        <StatCard label="Paid out (all time)" value={money(paidOut)} />
        <StatCard tone="dark" label="Platform fees earned (paid-out)" value={money(feesEarned)} />
      </div>

      <SectionTitle>
        Waiting to be paid · {payees.length} {payees.length === 1 ? "person" : "people"}
      </SectionTitle>
      {payees.length === 0 ? (
        <EmptyState>Every host and driver is paid up.</EmptyState>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {payees.map((p) => {
            const trips = owedFor(p.bookings, feePercent);
            const rides = owedForRides(p.rides);
            const owed = Math.round((trips.host + rides.host) * 100) / 100;
            const roles = [p.bookings.length ? "Host" : "", p.rides.length ? "Driver" : ""].filter(Boolean);
            return (
              <details key={p.id} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-900">{p.name}</span>
                    <span className="block truncate text-xs text-slate-500">{p.email}</span>
                  </span>
                  <span className="hidden gap-1 sm:flex">
                    {roles.map((role) => (
                      <Badge key={role} value={role === "Host" ? "HOST" : "DRIVER"} label={role} />
                    ))}
                  </span>
                  <span className="hidden text-xs text-slate-500 sm:block">
                    {[p.bookings.length && `${p.bookings.length} trips`, p.rides.length && `${p.rides.length} rides`].filter(Boolean).join(" · ")}
                  </span>
                  <span className="w-28 text-right text-[13px] font-semibold tabular-nums text-slate-900">{money(owed)}</span>
                </summary>
                <div className="grid gap-6 border-t border-slate-100 bg-slate-50/60 p-5 xl:grid-cols-[1fr_340px]">
                  <div className="min-w-0 space-y-4">
                    {p.bookings.length > 0 && (
                      <Table head={["Trip", "Vehicle", "Renter paid", "Fee", "Host gets"]}>
                        {p.bookings.map((b) => {
                          const split = splitEarnings(b.netPaid, feePercent);
                          return (
                            <tr key={b.id}>
                              <Td>
                                <TextLink href={`/dashboard/admin/bookings/${b.id}`}>
                                  {shortDate(b.startDate)} → {shortDate(b.endDate)}
                                </TextLink>
                              </Td>
                              <Td>
                                {b.listing.year} {b.listing.make} {b.listing.model}
                              </Td>
                              <Td className="tabular-nums">{money(b.netPaid)}</Td>
                              <Td className="tabular-nums text-slate-500">−{money(split.platformFee)}</Td>
                              <Td className="font-semibold tabular-nums">{money(split.hostEarnings)}</Td>
                            </tr>
                          );
                        })}
                      </Table>
                    )}
                    {p.rides.length > 0 && (
                      <Table head={["Ride", "Route", "Rider paid", "Fee", "Driver gets"]}>
                        {p.rides.map((r) => (
                          <tr key={r.id}>
                            <Td className="whitespace-nowrap">{shortDate(r.completedAt ?? r.createdAt)}</Td>
                            <Td className="max-w-[260px] truncate">
                              {r.pickupAddress.split(",")[0]} → {r.dropoffAddress.split(",")[0]}
                            </Td>
                            <Td className="tabular-nums">
                              {money(Number(r.totalPrice) - Number(r.refundedAmount))}
                              {Number(r.refundedAmount) > 0 && <p className="text-xs text-slate-400">after {money(r.refundedAmount)} refund</p>}
                            </Td>
                            <Td className="tabular-nums text-slate-500">−{money(r.platformFee)}</Td>
                            <Td className="font-semibold tabular-nums">{money(r.driverEarnings)}</Td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </div>
                  <div className="self-start rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-[13px] font-semibold text-slate-900">Record payment of {money(owed)}</p>
                    <AdminForm
                      endpoint="/api/admin/payouts"
                      method="POST"
                      extraBody={{ hostId: p.id, bookingIds: p.bookings.map((b) => b.id), rideIds: p.rides.map((r) => r.id) }}
                      submitLabel="Mark as paid"
                      variant="green"
                      successMessage="Payout recorded."
                      confirm={`Record that ${p.name} has been paid ${money(owed)} via {method}?`}
                      fields={[
                        { name: "method", label: "Paid via", required: true, placeholder: "Bank transfer, Zelle, Cash App…" },
                        { name: "reference", label: "Reference (optional)", placeholder: "Transaction ID or confirmation number" },
                        { name: "note", label: "Note (optional)", type: "textarea" },
                      ]}
                    />
                    <p className="mt-3 text-xs text-slate-500">
                      <TextLink href={`/dashboard/admin/users/${p.id}`}>View profile</TextLink>
                    </p>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      <SectionTitle>Payout history</SectionTitle>
      {history.length === 0 ? (
        <EmptyState>No payouts recorded yet.</EmptyState>
      ) : (
        <Table head={["Date", "Paid to", "Amount", "Trips", "Rides", "Paid via", "Reference", "Recorded by"]}>
          {history.map((p) => (
            <tr key={p.id}>
              <Td className="text-slate-600">{dateTime(p.createdAt)}</Td>
              <Td>
                <TextLink href={`/dashboard/admin/users/${p.host.id}`}>{p.host.name}</TextLink>
              </Td>
              <Td className="font-semibold">{money(p.amount)}</Td>
              <Td>{p._count.bookings}</Td>
              <Td>{p._count.rides}</Td>
              <Td>{p.method}</Td>
              <Td className="text-slate-500">{p.reference || "—"}</Td>
              <Td className="text-slate-500">{p.admin?.name ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
