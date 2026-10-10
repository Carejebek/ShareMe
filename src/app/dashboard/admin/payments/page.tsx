import type { Prisma } from "@prisma/client";
import { Badge, EmptyState, FilterBar, PageHeader, Pagination, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, dateTime, money, oneOf, pageNumber, param, requireAdmin, stripePaymentUrl, type SearchParams } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"] as const;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const status = oneOf(param(params, "status"), STATUSES);
  const page = pageNumber(params);

  const where: Prisma.PaymentWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { stripePaymentIntentId: { contains: q } },
            { bookingId: q },
            { booking: { renter: { name: { contains: q, mode: "insensitive" } } } },
            { booking: { renter: { email: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [payments, total, totals] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            renter: { select: { id: true, name: true } },
            listing: { select: { year: true, make: true, model: true, host: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.payment.count({ where }),
    prisma.payment.groupBy({ by: ["status"], _sum: { amount: true, refundedAmount: true }, _count: { _all: true } }),
  ]);

  const sum = (s: string) => Number(totals.find((t) => t.status === s)?._sum.amount ?? 0);
  // Refunds: fully refunded payments plus partial refunds on otherwise successful ones.
  const refundedTotal = totals.reduce((total, t) => total + Number(t._sum.refundedAmount ?? 0), 0);
  const partialRefunds = Number(totals.find((t) => t.status === "SUCCEEDED")?._sum.refundedAmount ?? 0);
  const count = (s: string) => totals.find((t) => t.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Rental payments processed through Stripe. To refund, open the booking."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="brand" label="Collected (net of refunds)" value={money(sum("SUCCEEDED") - partialRefunds)} hint={`${count("SUCCEEDED")} payments`} href="?status=SUCCEEDED" />
        <StatCard label="Pending" value={money(sum("PENDING"))} hint={`${count("PENDING")} payments`} href="?status=PENDING" />
        <StatCard tone={count("FAILED") ? "warn" : "light"} label="Failed" value={money(sum("FAILED"))} hint={`${count("FAILED")} payments`} href="?status=FAILED" />
        <StatCard label="Refunded" value={money(refundedTotal)} hint={`${count("REFUNDED")} fully refunded`} href="?status=REFUNDED" />
      </div>

      <FilterBar
        search={q}
        placeholder="Search renter, booking ID or Stripe payment ID (pi_…)"
        selects={[
          {
            name: "status",
            value: status ?? "",
            options: [
              { value: "", label: "Any status" },
              ...STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() })),
            ],
          },
        ]}
      />

      {payments.length === 0 ? (
        <EmptyState>No payments match these filters.</EmptyState>
      ) : (
        <Table head={["Date", "Amount", "Status", "Renter", "Vehicle / host", "Booking", "Stripe"]}>
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-neutral-50">
              <Td className="text-neutral-600">{dateTime(payment.createdAt)}</Td>
              <Td>
                <span className="font-black">{money(payment.amount)}</span>
                {Number(payment.refundedAmount) > 0 && (
                  <p className="text-xs font-bold text-purple-700">−{money(payment.refundedAmount)} refunded</p>
                )}
              </Td>
              <Td>
                {payment.status === "SUCCEEDED" && Number(payment.refundedAmount) > 0 ? (
                  <Badge value="PARTIALLY_REFUNDED" label="PARTLY REFUNDED" />
                ) : (
                  <Badge value={payment.status} />
                )}
              </Td>
              <Td>
                <TextLink href={`/dashboard/admin/users/${payment.booking.renter.id}`}>{payment.booking.renter.name}</TextLink>
              </Td>
              <Td>
                {payment.booking.listing.year} {payment.booking.listing.make} {payment.booking.listing.model}
                <p className="text-xs text-neutral-500">
                  Host:{" "}
                  <TextLink href={`/dashboard/admin/users/${payment.booking.listing.host.id}`}>
                    {payment.booking.listing.host.name}
                  </TextLink>
                </p>
              </Td>
              <Td>
                <TextLink href={`/dashboard/admin/bookings/${payment.booking.id}`}>View →</TextLink>
              </Td>
              <Td>
                <a
                  href={stripePaymentUrl(payment.stripePaymentIntentId)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-[#e62e1f] hover:underline"
                >
                  {payment.stripePaymentIntentId.slice(0, 14)}…
                </a>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
