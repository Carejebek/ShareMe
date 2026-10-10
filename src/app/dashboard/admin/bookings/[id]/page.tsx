import { notFound } from "next/navigation";
import { AdminActionButton } from "@/components/admin/AdminActions";
import AdminForm from "@/components/admin/AdminForm";
import AuditHistory from "@/components/admin/AuditHistory";
import { Badge, Card, DetailRow, PageHeader, TextLink } from "@/components/admin/ui";
import { dateTime, money, requireAdmin, shortDate, stripePaymentUrl } from "@/lib/admin";
import { BOOKING_TRANSITIONS } from "@/lib/adminRules";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL } from "@/lib/claims";
import { prisma } from "@/lib/prisma";

const DAY = 24 * 60 * 60 * 1000;

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      listing: { include: { host: { select: { id: true, name: true, email: true, phone: true } } } },
      renter: { select: { id: true, name: true, email: true, phone: true } },
      payment: { include: { refunds: { include: { admin: { select: { name: true } } }, orderBy: { createdAt: "desc" } } } },
      review: true,
      payout: { select: { id: true, createdAt: true, method: true, reference: true } },
      claims: { select: { id: true, type: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!booking) notFound();

  const days = Math.max(1, Math.round((booking.endDate.getTime() - booking.startDate.getTime()) / DAY));
  const next = BOOKING_TRANSITIONS[booking.status];
  const paid = booking.payment?.status === "SUCCEEDED";
  const refundable = booking.payment ? Number(booking.payment.amount) - Number(booking.payment.refundedAmount) : 0;

  return (
    <div className="space-y-6">
      <TextLink href="/dashboard/admin/bookings">← All bookings</TextLink>

      <PageHeader
        eyebrow={`Booking · ${booking.id}`}
        title={`${booking.listing.year} ${booking.listing.make} ${booking.listing.model}`}
        description={`${shortDate(booking.startDate)} → ${shortDate(booking.endDate)} · ${days} day${days === 1 ? "" : "s"}`}
        actions={
          <>
            {next.includes("CONFIRMED") && (
              <AdminActionButton
                endpoint={`/api/admin/bookings/${booking.id}`}
                body={{ status: "CONFIRMED" }}
                label="Confirm"
                variant="green"
                confirm={paid ? undefined : "This booking hasn't been paid. Confirm it anyway?"}
              />
            )}
            {next.includes("COMPLETED") && (
              <AdminActionButton
                endpoint={`/api/admin/bookings/${booking.id}`}
                body={{ status: "COMPLETED" }}
                label="Mark completed"
                variant="dark"
              />
            )}
            {next.includes("CANCELLED") && (
              <AdminActionButton
                endpoint={`/api/admin/bookings/${booking.id}`}
                body={{ status: "CANCELLED" }}
                label="Cancel booking"
                variant="red"
                confirm={
                  paid
                    ? "Cancel this booking? The renter has PAID — this does NOT refund them. Use the Refund form below (it can cancel the booking at the same time)."
                    : "Cancel this booking?"
                }
              />
            )}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge value={booking.status} />
        {booking.payment ? <Badge value={booking.payment.status} label={`PAYMENT ${booking.payment.status}`} /> : <Badge value="NONE" label="NO PAYMENT" />}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Trip">
          <DetailRow label="Vehicle">
            <TextLink href={`/dashboard/admin/vehicles/${booking.listing.id}`}>
              {booking.listing.make} {booking.listing.model}
            </TextLink>
          </DetailRow>
          <DetailRow label="Location">
            {booking.listing.city}, {booking.listing.state}
          </DetailRow>
          <DetailRow label="Pick-up">{dateTime(booking.startDate)}</DetailRow>
          <DetailRow label="Return">{dateTime(booking.endDate)}</DetailRow>
          <DetailRow label="Daily rate">{money(booking.listing.pricePerDay)}</DetailRow>
          <DetailRow label="Total">{money(booking.totalPrice)}</DetailRow>
          <DetailRow label="Booked">{dateTime(booking.createdAt)}</DetailRow>
        </Card>

        <Card title="People">
          <p className="text-xs font-black uppercase tracking-wider text-neutral-400">Renter</p>
          <DetailRow label="Name">
            <TextLink href={`/dashboard/admin/users/${booking.renter.id}`}>{booking.renter.name}</TextLink>
          </DetailRow>
          <DetailRow label="Email">{booking.renter.email}</DetailRow>
          <DetailRow label="Phone">{booking.renter.phone || "—"}</DetailRow>
          <p className="mt-5 text-xs font-black uppercase tracking-wider text-neutral-400">Host</p>
          <DetailRow label="Name">
            <TextLink href={`/dashboard/admin/users/${booking.listing.host.id}`}>{booking.listing.host.name}</TextLink>
          </DetailRow>
          <DetailRow label="Email">{booking.listing.host.email}</DetailRow>
          <DetailRow label="Phone">{booking.listing.host.phone || "—"}</DetailRow>
        </Card>

        <Card title="Payment">
          {booking.payment ? (
            <>
              <DetailRow label="Status">
                <Badge value={booking.payment.status} />
              </DetailRow>
              <DetailRow label="Amount">{money(booking.payment.amount)}</DetailRow>
              {Number(booking.payment.refundedAmount) > 0 && (
                <DetailRow label="Refunded">−{money(booking.payment.refundedAmount)}</DetailRow>
              )}
              <DetailRow label="Host payout">
                {booking.payout ? (
                  <Badge value="PAID_OUT" label={`PAID OUT ${shortDate(booking.payout.createdAt)}`} />
                ) : booking.status === "COMPLETED" && paid ? (
                  <Badge value="AWAITING_PAYOUT" label="AWAITING PAYOUT" />
                ) : (
                  "—"
                )}
              </DetailRow>
              {booking.payout && (
                <DetailRow label="Host received">
                  {money(booking.hostEarnings)} (fee {money(booking.platformFee)})
                </DetailRow>
              )}
              <DetailRow label="Created">{dateTime(booking.payment.createdAt)}</DetailRow>
              <DetailRow label="Updated">{dateTime(booking.payment.updatedAt)}</DetailRow>
              <a
                href={stripePaymentUrl(booking.payment.stripePaymentIntentId)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm font-black text-[#e62e1f]"
              >
                Open in Stripe →
              </a>
            </>
          ) : (
            <p className="text-sm text-neutral-500">The renter hasn&apos;t started checkout for this booking.</p>
          )}
        </Card>
      </div>

      {booking.review && (
        <Card title="Renter's review">
          <p className="font-bold">
            {"★".repeat(booking.review.rating)}
            <span className="text-neutral-300">{"★".repeat(5 - booking.review.rating)}</span>
          </p>
          {booking.review.comment && <p className="mt-2 text-sm text-neutral-700">{booking.review.comment}</p>}
        </Card>
      )}
      {paid && refundable > 0 && booking.payment && (
        <Card title="Refund the renter" className="max-w-2xl">
          <p className="mb-4 text-sm text-neutral-600">
            Sends money back to the renter&apos;s card through Stripe. This can&apos;t be undone. Up to {money(refundable)} can still be
            refunded.
          </p>
          {booking.payout && (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
              The host has already been paid {money(booking.hostEarnings)} for this trip. Refunding won&apos;t take that back, so
              you&apos;d need to recover it from the host yourself.
            </p>
          )}
          <AdminForm
            endpoint={`/api/admin/payments/${booking.payment.id}/refund`}
            method="POST"
            variant="red"
            submitLabel="Issue refund"
            successMessage="Refund sent."
            confirm="Refund ${amount} to the renter through Stripe? This moves real money and can't be undone."
            fields={[
              { name: "amount", label: "Amount (USD)", type: "number", step: "0.01", min: 0.01, max: refundable, required: true, defaultValue: refundable },
              { name: "reason", label: "Reason", type: "textarea", required: true, placeholder: "e.g. Host cancelled, car not as described…" },
              ...(booking.status === "PENDING" || booking.status === "CONFIRMED"
                ? [{ name: "cancelBooking", label: "Also cancel this booking", type: "checkbox" as const, defaultValue: true }]
                : []),
            ]}
          />
        </Card>
      )}

      {booking.payment && booking.payment.refunds.length > 0 && (
        <Card title="Refunds">
          <ul className="space-y-3 text-sm">
            {booking.payment.refunds.map((refund) => (
              <li key={refund.id} className="flex justify-between gap-4 border-b border-neutral-100 pb-3 last:border-0">
                <div>
                  <p className="font-bold">{money(refund.amount)}</p>
                  <p className="text-neutral-500">{refund.reason}</p>
                </div>
                <p className="text-right text-neutral-500">
                  {dateTime(refund.createdAt)}
                  <br />
                  by {refund.admin?.name ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {booking.claims.length > 0 && (
        <Card title="Claims on this trip">
          <ul className="space-y-2 text-sm">
            {booking.claims.map((claim) => (
              <li key={claim.id} className="flex items-center justify-between gap-4">
                <TextLink href={`/dashboard/admin/claims/${claim.id}`}>
                  {CLAIM_TYPE_LABEL[claim.type]} · {shortDate(claim.createdAt)}
                </TextLink>
                <Badge value={claim.status} label={CLAIM_STATUS_LABEL[claim.status]} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <AuditHistory targetType="BOOKING" targetId={booking.id} />
    </div>
  );
}
