import { notFound } from "next/navigation";
import AdminForm from "@/components/admin/AdminForm";
import AuditHistory from "@/components/admin/AuditHistory";
import { Badge, Card, DetailRow, PageHeader, TextLink } from "@/components/admin/ui";
import { dateTime, money, requireAdmin, shortDate } from "@/lib/admin";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL } from "@/lib/claims";
import { prisma } from "@/lib/prisma";

export default async function AdminClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const claim = await prisma.claim.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      booking: {
        include: {
          renter: { select: { id: true, name: true, email: true, phone: true } },
          listing: { include: { host: { select: { id: true, name: true, email: true, phone: true } } } },
          payment: { select: { id: true, amount: true, refundedAmount: true, status: true } },
        },
      },
    },
  });
  if (!claim) notFound();

  const { booking } = claim;
  const reporterIsRenter = claim.reporterId === booking.renterId;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Claim · ${claim.id}`}
        title={`${CLAIM_TYPE_LABEL[claim.type]} — ${booking.listing.year} ${booking.listing.make} ${booking.listing.model}`}
        description={`Filed by the ${reporterIsRenter ? "renter" : "host"}, ${claim.reporter.name}, on ${dateTime(claim.createdAt)}`}
      />

      <Badge value={claim.status} label={CLAIM_STATUS_LABEL[claim.status]} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="What happened">
          <p className="whitespace-pre-line text-slate-800">{claim.description}</p>
          {claim.amountRequested && (
            <p className="mt-4 text-[13px]">
              Amount requested: <strong>{money(claim.amountRequested)}</strong>
            </p>
          )}
          {claim.imageUrls.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
              {claim.imageUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-32 w-full rounded-md object-cover" />
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card title="Decision">
          <AdminForm
            endpoint={`/api/admin/claims/${claim.id}`}
            submitLabel="Save decision"
            fields={[
              {
                name: "status",
                label: "Status",
                type: "select",
                defaultValue: claim.status,
                options: ["OPEN", "IN_REVIEW", "RESOLVED", "DENIED"].map((s) => ({ value: s, label: CLAIM_STATUS_LABEL[s] })),
              },
              {
                name: "resolution",
                label: "Decision / notes",
                type: "textarea",
                defaultValue: claim.resolution ?? "",
                placeholder: "Required when resolving or denying. The person who filed the claim sees this.",
              },
              {
                name: "amountApproved",
                label: "Amount approved (USD)",
                type: "number",
                step: "0.01",
                min: 0,
                defaultValue: claim.amountApproved ? Number(claim.amountApproved) : "",
                hint: "Recorded only. Collect or pay the money yourself, e.g. a refund from the booking page or a payment from the renter.",
              },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Booking">
          <DetailRow label="Trip">
            <TextLink href={`/dashboard/admin/bookings/${booking.id}`}>
              {shortDate(booking.startDate)} → {shortDate(booking.endDate)}
            </TextLink>
          </DetailRow>
          <DetailRow label="Status">
            <Badge value={booking.status} />
          </DetailRow>
          <DetailRow label="Total">{money(booking.totalPrice)}</DetailRow>
          <DetailRow label="Payment">{booking.payment ? <Badge value={booking.payment.status} /> : "None"}</DetailRow>
        </Card>
        <Card title="Renter">
          <DetailRow label="Name">
            <TextLink href={`/dashboard/admin/users/${booking.renter.id}`}>{booking.renter.name}</TextLink>
          </DetailRow>
          <DetailRow label="Email">{booking.renter.email}</DetailRow>
          <DetailRow label="Phone">{booking.renter.phone || "—"}</DetailRow>
        </Card>
        <Card title="Host">
          <DetailRow label="Name">
            <TextLink href={`/dashboard/admin/users/${booking.listing.host.id}`}>{booking.listing.host.name}</TextLink>
          </DetailRow>
          <DetailRow label="Email">{booking.listing.host.email}</DetailRow>
          <DetailRow label="Phone">{booking.listing.host.phone || "—"}</DetailRow>
        </Card>
      </div>

      <AuditHistory targetType="CLAIM" targetId={claim.id} />
    </div>
  );
}
