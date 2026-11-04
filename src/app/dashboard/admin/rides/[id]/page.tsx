import { notFound } from "next/navigation";
import { AdminActionButton, AdminSelectAction } from "@/components/admin/AdminActions";
import AdminForm from "@/components/admin/AdminForm";
import AuditHistory from "@/components/admin/AuditHistory";
import { Badge, Callout, Card, DetailRow, PageHeader, TextLink } from "@/components/admin/ui";
import { dateTime, money, requireAdmin, shortDate, stripePaymentUrl } from "@/lib/admin";
import { activeDriverWhere, vehicleLabel } from "@/lib/drivers";
import { STATUS_LABEL, formatDistance, mapsDirectionsUrl } from "@/lib/format";
import { routeImageUrl } from "@/lib/maps";
import type { Fare } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { FINAL_STATUSES, NEXT_STATUS } from "@/lib/rides";

const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: "Not paid",
  CASH: "Paid (cash)",
  AUTHORIZED: "Card on hold",
  CAPTURED: "Charged",
  RELEASED: "Hold released",
  FAILED: "Charge failed",
};

const ADVANCE_LABEL: Record<string, string> = {
  EN_ROUTE: "Mark driver on the way",
  IN_PROGRESS: "Mark trip started",
  COMPLETED: "Mark completed",
};

export default async function AdminRideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const ride = await prisma.ride.findUnique({
    where: { id },
    include: {
      rider: { select: { id: true, name: true, email: true, phone: true } },
      driver: { select: { id: true, name: true, email: true, phone: true, driverProfile: true } },
      payout: { select: { id: true, createdAt: true, method: true, reference: true } },
      refunds: { include: { admin: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!ride) notFound();

  const drivers = await prisma.user.findMany({ where: activeDriverWhere(), select: { id: true, name: true }, orderBy: { name: "asc" } });

  const finished = FINAL_STATUSES.includes(ride.status);
  const next = NEXT_STATUS[ride.status];
  const canAssign = ride.status === "REQUESTED" || ride.status === "ACCEPTED";
  const total = Number(ride.totalPrice);
  const refunded = Number(ride.refundedAmount);
  const refundable = Math.round((total - refunded) * 100) / 100;
  const breakdown = (ride.fareBreakdown ?? null) as Partial<Fare> | null;
  const bookedAt = breakdown?.total ?? null;
  const adjusted = bookedAt !== null && Math.abs(bookedAt - total) >= 0.01;
  const mapUrl = ride.routePolyline ? routeImageUrl(ride.routePolyline) : null;
  const paymentKey = ride.paymentStatus === "UNPAID" && ride.paid ? "CASH" : ride.paymentStatus;

  // Timeline from the ride's own timestamps, plus refunds.
  const timeline = [
    { at: ride.createdAt, label: "Booked", detail: ride.scheduledAt ? `Scheduled for ${dateTime(ride.scheduledAt)}` : "As soon as possible" },
    { at: ride.requestedAt, label: "Card hold placed", detail: `${money(bookedAt ?? total)} held · shown to drivers` },
    { at: ride.acceptedAt, label: "Driver assigned", detail: ride.driver?.name ?? "" },
    { at: ride.enRouteAt, label: "Driver on the way", detail: "" },
    { at: ride.startedAt, label: "Trip started", detail: "" },
    { at: ride.completedAt, label: "Completed", detail: ride.paymentStatus === "CAPTURED" ? `${money(total)} charged` : "" },
    {
      // Rides cancelled before cancelledAt existed fall back to their last update.
      at: ride.status === "CANCELLED" ? ride.cancelledAt ?? ride.updatedAt : null,
      label: "Cancelled",
      detail: ride.cancelReason ?? "",
    },
    ...ride.refunds.map((r) => ({ at: r.createdAt, label: `Refunded ${money(r.amount)}`, detail: `${r.reason} · by ${r.admin?.name ?? "—"}` })),
  ]
    .filter((e): e is { at: Date; label: string; detail: string } => Boolean(e.at))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const waitMinutes = ride.requestedAt && ride.acceptedAt ? Math.round((ride.acceptedAt.getTime() - ride.requestedAt.getTime()) / 60000) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Ride · ${ride.id}`}
        title={`${ride.pickupAddress.split(",")[0]} → ${ride.dropoffAddress.split(",")[0]}`}
        description={`${ride.scheduledAt ? `Scheduled ${dateTime(ride.scheduledAt)}` : "ASAP"} · booked ${dateTime(ride.createdAt)} · ${formatDistance(ride.distanceMeters)} · ~${ride.durationMinutes} min`}
        actions={
          <>
            {next && ride.driverId && (
              <AdminActionButton
                endpoint={`/api/rides/${ride.id}`}
                body={{ action: "advance" }}
                label={ADVANCE_LABEL[next] ?? "Next step"}
                variant={next === "COMPLETED" ? "green" : "dark"}
                confirm={
                  next === "COMPLETED"
                    ? `Mark this ride completed? ${ride.paymentStatus === "AUTHORIZED" ? `The rider's card will be charged ${money(total)}.` : ""}`
                    : undefined
                }
              />
            )}
            {!finished && (
              <AdminActionButton
                endpoint={`/api/rides/${ride.id}`}
                body={{ action: "cancel" }}
                label="Cancel ride"
                variant="red"
                confirm="Cancel this ride? The card hold is released and the rider and driver are texted."
              />
            )}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge value={ride.status} label={STATUS_LABEL[ride.status]} />
        <Badge value={paymentKey} label={PAYMENT_LABEL[paymentKey]} />
        {refunded > 0 && <Badge value="REFUNDED" label={refunded >= total ? "Fully refunded" : `Refunded ${money(refunded)}`} />}
        {adjusted && <Badge value="PENDING" label="Fare adjusted" />}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Route" className="xl:col-span-2">
          {mapUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mapUrl} alt="Map of the route" className="mb-4 aspect-[2/1] w-full rounded-md border border-slate-200 bg-slate-100 object-cover" />
          ) : (
            <p className="mb-4 text-[13px] text-slate-500">No route map for this ride (booked before route maps were saved).</p>
          )}
          <DetailRow label="Pickup">{ride.pickupAddress}</DetailRow>
          <DetailRow label="Drop-off">{ride.dropoffAddress}</DetailRow>
          <DetailRow label="When">{ride.scheduledAt ? dateTime(ride.scheduledAt) : "As soon as possible"}</DetailRow>
          <DetailRow label="Distance · time">
            {formatDistance(ride.distanceMeters)} · ~{ride.durationMinutes} min
          </DetailRow>
          {ride.notes && <DetailRow label="Rider notes">{ride.notes}</DetailRow>}
          <a href={mapsDirectionsUrl(ride)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[13px] font-semibold text-blue-700">
            Open in Google Maps →
          </a>
        </Card>

        <Card title="Timeline">
          <ol className="relative space-y-4 text-[13px] before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-slate-200">
            {timeline.map((e, i) => (
              <li key={i} className="relative pl-6">
                <span
                  className={`absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-white ${
                    e.label === "Cancelled" ? "bg-rose-500" : e.label.startsWith("Refunded") ? "bg-amber-500" : "bg-slate-900"
                  }`}
                />
                <p className="font-medium text-slate-900">{e.label}</p>
                <p className="text-slate-500">{dateTime(e.at)}</p>
                {e.detail && <p className="text-slate-500">{e.detail}</p>}
              </li>
            ))}
          </ol>
          {waitMinutes !== null && <p className="mt-4 text-xs text-slate-500">Waited {waitMinutes} min for a driver.</p>}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Rider">
          <DetailRow label="Name">
            <TextLink href={`/dashboard/admin/users/${ride.rider.id}`}>{ride.rider.name}</TextLink>
          </DetailRow>
          <DetailRow label="Email">{ride.rider.email}</DetailRow>
          <DetailRow label="Ride phone">{ride.riderPhone}</DetailRow>
        </Card>

        <Card title="Driver">
          {ride.driver ? (
            <>
              <DetailRow label="Name">
                <TextLink href={`/dashboard/admin/users/${ride.driver.id}`}>{ride.driver.name}</TextLink>
              </DetailRow>
              <DetailRow label="Phone">{ride.driver.phone || "—"}</DetailRow>
              {ride.driver.driverProfile && (
                <>
                  <DetailRow label="Vehicle">{vehicleLabel(ride.driver.driverProfile)}</DetailRow>
                  <DetailRow label="Plate">{ride.driver.driverProfile.vehiclePlate}</DetailRow>
                  <DetailRow label="Insurance until">
                    <span className={ride.driver.driverProfile.insuranceExpiresAt < new Date() ? "font-semibold text-rose-600" : ""}>
                      {shortDate(ride.driver.driverProfile.insuranceExpiresAt)}
                    </span>
                  </DetailRow>
                </>
              )}
            </>
          ) : (
            <p className="text-[13px] text-slate-500">No driver yet.</p>
          )}
          {canAssign && drivers.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-[13px] font-medium text-slate-700">{ride.driver ? "Reassign" : "Assign a driver"}</p>
              <AdminSelectAction
                endpoint={`/api/rides/${ride.id}`}
                field="driverId"
                extraBody={{ action: "assign" }}
                value={ride.driver?.id ?? ""}
                placeholder="Choose driver…"
                options={drivers.map((d) => ({ value: d.id, label: d.name }))}
              />
            </div>
          )}
        </Card>

        <Card title="Fare & payment">
          {breakdown ? (
            <>
              {!!breakdown.baseFare && <DetailRow label="Base fare">{money(breakdown.baseFare)}</DetailRow>}
              {!!breakdown.ratePerMinute && (
                <DetailRow label={`${breakdown.minutes} min × ${money(breakdown.ratePerMinute)}`}>{money(breakdown.timeCharge)}</DetailRow>
              )}
              {!!breakdown.perDistance && (
                <DetailRow label={`${breakdown.distance} ${breakdown.distanceUnit} × ${money(breakdown.perDistance)}`}>
                  {money(breakdown.distanceCharge)}
                </DetailRow>
              )}
              {breakdown.minimumApplied && <DetailRow label="Minimum fare applied">{money(breakdown.minimumFare)}</DetailRow>}
              {!!breakdown.bookingFee && <DetailRow label="Booking fee">{money(breakdown.bookingFee)}</DetailRow>}
              <DetailRow label="Booked price">{money(bookedAt)}</DetailRow>
            </>
          ) : (
            <>
              <DetailRow label={`${ride.durationMinutes} min × ${money(ride.ratePerMinute)}`}>
                {money(ride.durationMinutes * Number(ride.ratePerMinute))}
              </DetailRow>
              <DetailRow label="Minimum fare">{money(ride.minimumFare)}</DetailRow>
            </>
          )}
          {adjusted && <DetailRow label="Adjusted fare">{money(total)}</DetailRow>}
          <DetailRow label={ride.paymentStatus === "CAPTURED" ? "Charged" : "To charge"}>
            <span className="font-semibold">{money(total)}</span>
          </DetailRow>
          {refunded > 0 && <DetailRow label="Refunded">−{money(refunded)}</DetailRow>}
          {ride.platformFee !== null && (
            <>
              <DetailRow label="Platform fee">{money(ride.platformFee)}</DetailRow>
              <DetailRow label="Driver earns">{money(ride.driverEarnings)}</DetailRow>
            </>
          )}
          <DetailRow label="Driver payout">
            {ride.payout ? (
              <TextLink href="/dashboard/admin/payouts">Paid out {shortDate(ride.payout.createdAt)}</TextLink>
            ) : ride.paymentStatus === "CAPTURED" && ride.driverId ? (
              "Awaiting payout"
            ) : (
              "—"
            )}
          </DetailRow>
          {ride.stripePaymentIntentId && (
            <a
              href={stripePaymentUrl(ride.stripePaymentIntentId)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-[13px] font-semibold text-blue-700"
            >
              Open in Stripe →
            </a>
          )}
        </Card>
      </div>

      {ride.paymentStatus === "FAILED" && (
        <Callout tone="danger" title="The card charge failed">
          The trip was completed but Stripe couldn&apos;t charge the rider. Check the payment in Stripe and contact the rider.
        </Callout>
      )}

      {ride.paymentStatus === "AUTHORIZED" && ride.status !== "CANCELLED" && (
        <Card title="Adjust the fare" className="max-w-2xl">
          <p className="mb-4 text-[13px] text-slate-600">
            Changes what the rider is charged when the trip is completed, e.g. a discount for a bad trip. The card is held for{" "}
            {money(bookedAt ?? total)}, so the fare can be lowered but not raised above that. To charge less after the trip, use a
            refund instead.
          </p>
          <AdminForm
            endpoint={`/api/admin/rides/${ride.id}/fare`}
            submitLabel="Save new fare"
            successMessage="Fare updated."
            confirm="Change the fare to ${amount}? The rider will be charged this when the trip is completed."
            fields={[
              { name: "amount", label: "New fare (USD)", type: "number", step: "0.01", min: 0.5, required: true, defaultValue: total },
              { name: "reason", label: "Reason", type: "textarea", required: true, placeholder: "e.g. Driver took a wrong turn, goodwill discount…" },
            ]}
          />
        </Card>
      )}

      {ride.paymentStatus === "CAPTURED" && refundable > 0 && (
        <Card title="Refund the rider" className="max-w-2xl">
          <p className="mb-4 text-[13px] text-slate-600">
            Sends money back to the rider&apos;s card through Stripe. This can&apos;t be undone. Up to {money(refundable)} can still be
            refunded.{" "}
            {!ride.payout && ride.driverId && "The driver's share and the platform fee are reduced in proportion."}
          </p>
          {ride.payout && (
            <div className="mb-4">
              <Callout tone="danger">
                The driver has already been paid {money(ride.driverEarnings)} for this ride. Refunding won&apos;t take that back, so
                you&apos;d need to recover it from the driver yourself.
              </Callout>
            </div>
          )}
          <AdminForm
            endpoint={`/api/admin/rides/${ride.id}/refund`}
            method="POST"
            variant="red"
            submitLabel="Issue refund"
            successMessage="Refund sent."
            resetOnSuccess
            confirm="Refund ${amount} to the rider through Stripe? This moves real money and can't be undone."
            fields={[
              { name: "amount", label: "Amount (USD)", type: "number", step: "0.01", min: 0.01, max: refundable, required: true, defaultValue: refundable },
              { name: "reason", label: "Reason", type: "textarea", required: true, placeholder: "e.g. Driver took a longer route, rider was overcharged…" },
            ]}
          />
        </Card>
      )}

      {ride.refunds.length > 0 && (
        <Card title="Refunds">
          <ul className="space-y-3 text-[13px]">
            {ride.refunds.map((refund) => (
              <li key={refund.id} className="flex justify-between gap-4 border-b border-slate-100 pb-3 last:border-0">
                <div>
                  <p className="font-medium">{money(refund.amount)}</p>
                  <p className="text-slate-500">{refund.reason}</p>
                </div>
                <p className="text-right text-slate-500">
                  {dateTime(refund.createdAt)}
                  <br />
                  by {refund.admin?.name ?? "—"}
                </p>
              </li>
            ))}
          </ul>
          {refunded > ride.refunds.reduce((s, r) => s + Number(r.amount), 0) + 0.005 && (
            <p className="mt-3 text-xs text-slate-500">Some of the refunded total was made directly in the Stripe dashboard.</p>
          )}
        </Card>
      )}

      <AuditHistory targetType="RIDE" targetId={ride.id} />
    </div>
  );
}
