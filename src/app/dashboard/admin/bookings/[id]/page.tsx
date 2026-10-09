import { notFound } from "next/navigation";
import { AdminActionButton } from "@/components/admin/AdminActions";
import { Badge, Card, DetailRow, PageHeader, TextLink } from "@/components/admin/ui";
import { dateTime, money, requireAdmin, shortDate, stripePaymentUrl } from "@/lib/admin";
import { BOOKING_TRANSITIONS } from "@/lib/adminRules";
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
      payment: true,
      review: true,
    },
  });
  if (!booking) notFound();

  const days = Math.max(1, Math.round((booking.endDate.getTime() - booking.startDate.getTime()) / DAY));
  const next = BOOKING_TRANSITIONS[booking.status];
  const paid = booking.payment?.status === "SUCCEEDED";

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
                    ? "Cancel this booking? The renter has PAID — this does NOT refund them. Issue any refund in Stripe."
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
    </div>
  );
}
