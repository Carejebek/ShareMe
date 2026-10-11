import AdminForm from "@/components/admin/AdminForm";
import { Icon } from "@/components/admin/icons";
import { EmptyState, PageHeader, SectionTitle, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { dateTime, money, requireAdmin, shortDate } from "@/lib/admin";
import { getUnpaidBookings, owedFor } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import { getPlatformFeePercent, splitEarnings } from "@/lib/settings";

export default async function AdminPayoutsPage() {
  await requireAdmin();

  const [unpaid, feePercent, history, paidTotals] = await Promise.all([
    getUnpaidBookings(),
    getPlatformFeePercent(),
    prisma.payout.findMany({
      include: {
        host: { select: { id: true, name: true } },
        admin: { select: { name: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.booking.aggregate({ where: { payoutId: { not: null } }, _sum: { hostEarnings: true, platformFee: true } }),
  ]);

  // Group unpaid bookings by host.
  const byHost = new Map<string, { host: (typeof unpaid)[number]["listing"]["host"]; bookings: typeof unpaid }>();
  for (const booking of unpaid) {
    const entry = byHost.get(booking.listing.host.id) ?? { host: booking.listing.host, bookings: [] };
    entry.bookings.push(booking);
    byHost.set(booking.listing.host.id, entry);
  }
  const hosts = [...byHost.values()];
  const owedTotal = owedFor(unpaid, feePercent);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Host payouts"
        description={`Hosts are owed ${100 - feePercent}% of what the renter paid (after refunds) for each completed trip. Pay them yourself, then record it here.`}
        actions={<TextLink href="/dashboard/admin/settings">Platform fee: {feePercent}% →</TextLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone={owedTotal.host ? "warn" : "light"} label="Owed to hosts now" value={money(owedTotal.host)} hint={`${unpaid.length} completed trips across ${hosts.length} hosts`} />
        <StatCard label="Platform fee on those trips" value={money(owedTotal.fee)} />
        <StatCard label="Paid to hosts (all time)" value={money(paidTotals._sum.hostEarnings)} />
        <StatCard tone="dark" label="Platform fees earned (paid-out trips)" value={money(paidTotals._sum.platformFee)} />
      </div>

      <SectionTitle>Waiting to be paid · {hosts.length} host{hosts.length === 1 ? "" : "s"}</SectionTitle>
      {hosts.length === 0 ? (
        <EmptyState>Every host is paid up.</EmptyState>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {hosts.map(({ host, bookings }) => {
            const owed = owedFor(bookings, feePercent);
            return (
              <details key={host.id} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-900">{host.name}</span>
                    <span className="block truncate text-xs text-slate-500">{host.email}</span>
                  </span>
                  <span className="hidden text-xs text-slate-500 sm:block">
                    {bookings.length} trip{bookings.length === 1 ? "" : "s"} · fee {money(owed.fee)}
                  </span>
                  <span className="w-28 text-right text-[13px] font-semibold tabular-nums text-slate-900">{money(owed.host)}</span>
                </summary>
                <div className="grid gap-6 border-t border-slate-100 bg-slate-50/60 p-5 xl:grid-cols-[1fr_340px]">
                  <div className="min-w-0">
                    <Table head={["Trip", "Vehicle", "Renter paid", "Fee", "Host gets"]}>
                      {bookings.map((b) => {
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
                  </div>
                  <div className="self-start rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-[13px] font-semibold text-slate-900">
                      Record payment of {money(owed.host)}
                    </p>
                    <AdminForm
                      endpoint="/api/admin/payouts"
                      method="POST"
                      extraBody={{ hostId: host.id, bookingIds: bookings.map((b) => b.id) }}
                      submitLabel="Mark as paid"
                      variant="green"
                      successMessage="Payout recorded."
                      confirm={`Record that ${host.name} has been paid ${money(owed.host)} via {method}?`}
                      fields={[
                        { name: "method", label: "Paid via", required: true, placeholder: "Bank transfer, Zelle, Cash App…" },
                        { name: "reference", label: "Reference (optional)", placeholder: "Transaction ID or confirmation number" },
                        { name: "note", label: "Note (optional)", type: "textarea" },
                      ]}
                    />
                    <p className="mt-3 text-xs text-slate-500">
                      <TextLink href={`/dashboard/admin/users/${host.id}`}>View host profile</TextLink>
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
        <Table head={["Date", "Host", "Amount", "Trips", "Paid via", "Reference", "Recorded by"]}>
          {history.map((p) => (
            <tr key={p.id}>
              <Td className="text-slate-600">{dateTime(p.createdAt)}</Td>
              <Td>
                <TextLink href={`/dashboard/admin/users/${p.host.id}`}>{p.host.name}</TextLink>
              </Td>
              <Td className="font-semibold">{money(p.amount)}</Td>
              <Td>{p._count.bookings}</Td>
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
