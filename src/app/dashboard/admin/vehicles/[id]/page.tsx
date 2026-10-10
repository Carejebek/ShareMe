import { notFound } from "next/navigation";
import { AdminActionButton } from "@/components/admin/AdminActions";
import AdminForm from "@/components/admin/AdminForm";
import AuditHistory from "@/components/admin/AuditHistory";
import { Badge, Card, DetailRow, EmptyState, PageHeader, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { money, requireAdmin, shortDate } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminVehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      host: {
        select: { id: true, name: true, email: true, phone: true, createdAt: true, verificationStatus: true, suspendedAt: true },
      },
      bookings: {
        include: { renter: { select: { id: true, name: true } }, payment: { select: { status: true } } },
        orderBy: { startDate: "desc" },
      },
      reviews: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!listing) notFound();

  const earned = listing.bookings
    .filter((b) => b.payment?.status === "SUCCEEDED")
    .reduce((sum, b) => sum + Number(b.totalPrice), 0);
  const rating = listing.reviews.length
    ? (listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length).toFixed(1)
    : "—";
  const isLive = listing.isActive && listing.approvalStatus === "APPROVED" && !listing.host.suspendedAt;
  const hostVerified = listing.host.verificationStatus === "VERIFIED";

  return (
    <div className="space-y-6">
      <TextLink href="/dashboard/admin/vehicles">← All vehicles</TextLink>

      <PageHeader
        eyebrow={`Vehicle · ${listing.id}`}
        title={`${listing.year} ${listing.make} ${listing.model}`}
        description={listing.title}
        actions={
          <>
            {listing.approvalStatus !== "APPROVED" && (
              <AdminActionButton
                endpoint={`/api/admin/listings/${listing.id}/approval`}
                body={{ status: "APPROVED" }}
                label="Approve"
                variant="green"
                disabled={!hostVerified}
              />
            )}
            {listing.approvalStatus !== "REJECTED" && (
              <AdminActionButton
                endpoint={`/api/admin/listings/${listing.id}/approval`}
                body={{ status: "REJECTED" }}
                label="Reject"
                variant="red"
                promptFor={{ field: "reason", message: "Why is this vehicle being rejected? The host will see this." }}
              />
            )}
            <AdminActionButton
              endpoint={`/api/admin/listings/${listing.id}`}
              body={{ isActive: !listing.isActive }}
              label={listing.isActive ? "Deactivate" : "Reactivate"}
              variant="outline"
              confirm={
                listing.isActive
                  ? "Take this listing offline? Renters won't be able to see or book it."
                  : "Put this listing back online?"
              }
            />
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge value={listing.approvalStatus} />
        <Badge value={listing.isActive ? "ACTIVE" : "INACTIVE"} />
        {isLive && <Badge value="LIVE" label="LIVE ON MARKETPLACE" />}
      </div>

      {!hostVerified && listing.approvalStatus !== "APPROVED" && (
        <p className="rounded-2xl bg-orange-50 px-5 py-4 text-sm font-bold text-orange-900">
          This car can&apos;t be approved until the host&apos;s driver&apos;s licence is verified (currently{" "}
          {listing.host.verificationStatus.toLowerCase()}).{" "}
          <TextLink href={`/dashboard/admin/users/${listing.host.id}`}>Review the host →</TextLink>
        </p>
      )}
      {listing.host.suspendedAt && (
        <p className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-800">
          The host is suspended, so this car is hidden from the marketplace.
        </p>
      )}
      {listing.approvalStatus === "REJECTED" && listing.rejectionReason && (
        <p className="rounded-2xl bg-neutral-100 px-5 py-4 text-sm text-neutral-700">
          <strong>Rejection reason (shown to host):</strong> {listing.rejectionReason}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Bookings" value={listing.bookings.length} />
        <StatCard label="Paid revenue" value={money(earned)} />
        <StatCard label="Rating" value={rating} hint={`${listing.reviews.length} reviews`} />
      </div>

      {listing.imageUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {listing.imageUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-40 w-full rounded-2xl object-cover" />
            </a>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Details">
          <DetailRow label="Price">{money(listing.pricePerDay)} / day</DetailRow>
          <DetailRow label="Location">
            {listing.city}, {listing.state}, {listing.country}
          </DetailRow>
          <DetailRow label="Seats">{listing.seats}</DetailRow>
          <DetailRow label="Transmission">{listing.transmission}</DetailRow>
          <DetailRow label="Fuel">{listing.fuelType}</DetailRow>
          <DetailRow label="Listed">{shortDate(listing.createdAt)}</DetailRow>
          <DetailRow label="Public page">
            <TextLink href={`/listings/${listing.id}`}>{isLive ? "Open →" : "Preview (not public) →"}</TextLink>
          </DetailRow>
          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-neutral-600">{listing.description}</p>
        </Card>

        <Card title="Host">
          <DetailRow label="Name">
            <TextLink href={`/dashboard/admin/users/${listing.host.id}`}>{listing.host.name}</TextLink>
          </DetailRow>
          <DetailRow label="Email">
            <a href={`mailto:${listing.host.email}`} className="hover:text-[#ff5a1f]">
              {listing.host.email}
            </a>
          </DetailRow>
          <DetailRow label="Phone">{listing.host.phone || "—"}</DetailRow>
          <DetailRow label="Member since">{shortDate(listing.host.createdAt)}</DetailRow>
          <DetailRow label="Licence">
            <Badge value={listing.host.verificationStatus} />
          </DetailRow>
        </Card>
      </div>

      <Card title="Bookings">
        {listing.bookings.length === 0 ? (
          <EmptyState>This vehicle hasn&apos;t been booked yet.</EmptyState>
        ) : (
          <Table head={["Dates", "Renter", "Total", "Booking", "Payment"]}>
            {listing.bookings.map((booking) => (
              <tr key={booking.id}>
                <Td>
                  <TextLink href={`/dashboard/admin/bookings/${booking.id}`}>
                    {shortDate(booking.startDate)} → {shortDate(booking.endDate)}
                  </TextLink>
                </Td>
                <Td>
                  <TextLink href={`/dashboard/admin/users/${booking.renter.id}`}>{booking.renter.name}</TextLink>
                </Td>
                <Td className="font-bold">{money(booking.totalPrice)}</Td>
                <Td>
                  <Badge value={booking.status} />
                </Td>
                <Td>{booking.payment ? <Badge value={booking.payment.status} /> : "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Reviews">
        {listing.reviews.length === 0 ? (
          <EmptyState>No reviews yet.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {listing.reviews.map((review) => (
              <li key={review.id} className="rounded-2xl bg-neutral-50 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">
                    {"★".repeat(review.rating)}
                    <span className="text-neutral-300">{"★".repeat(5 - review.rating)}</span> ·{" "}
                    <TextLink href={`/dashboard/admin/users/${review.author.id}`}>{review.author.name}</TextLink>
                  </p>
                  <span className="text-neutral-500">{shortDate(review.createdAt)}</span>
                </div>
                {review.comment && <p className="mt-2 text-neutral-700">{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Internal notes">
          <p className="mb-4 text-sm text-neutral-500">Only admins can see these.</p>
          <AdminForm
            endpoint={`/api/admin/listings/${listing.id}`}
            submitLabel="Save notes"
            fields={[{ name: "adminNotes", label: "Notes", type: "textarea", defaultValue: listing.adminNotes ?? "" }]}
          />
        </Card>
        <AuditHistory targetType="LISTING" targetId={listing.id} />
      </div>
    </div>
  );
}
