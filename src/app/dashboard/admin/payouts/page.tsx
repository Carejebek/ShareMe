import AdminForm from "@/components/admin/AdminForm";
import { Card, EmptyState, PageHeader, SectionTitle, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
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

      <SectionTitle>Waiting to be paid</SectionTitle>
      {hosts.length === 0 ? (
        <EmptyState>Every host is paid up.</EmptyState>
      ) : (
        hosts.map(({ host, bookings }) => {
          const owed = owedFor(bookings, feePercent);
          return (
            <Card
              key={host.id}
              title={`${host.name} — ${money(owed.host)}`}
              action={
                <span className="text-[13px] text-slate-500">
                  {host.email} · <TextLink href={`/dashboard/admin/users/${host.id}`}>Profile →</TextLink>
                </span>
              }
            >
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
                      <Td>{money(b.netPaid)}</Td>
                      <Td className="text-slate-500">−{money(split.platformFee)}</Td>
                      <Td className="font-semibold">{money(split.hostEarnings)}</Td>
                    </tr>
                  );
                })}
              </Table>
              <div className="mt-8 max-w-xl rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-[13px] font-semibold text-slate-900">Record payment of {money(owed.host)} to {host.name}</p>
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
              </div>
            </Card>
          );
        })
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
