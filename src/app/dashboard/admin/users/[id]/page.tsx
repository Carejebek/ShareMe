import { notFound } from "next/navigation";
import { AdminActionButton, AdminSelectAction } from "@/components/admin/AdminActions";
import AdminForm from "@/components/admin/AdminForm";
import AuditHistory from "@/components/admin/AuditHistory";
import VerificationReview from "@/components/admin/VerificationReview";
import { Badge, Callout, Card, DetailRow, EmptyState, PageHeader, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { dateTime, money, requireAdmin, shortDate } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const ROLE_OPTIONS = [
  { value: "RENTER", label: "Renter" },
  { value: "HOST", label: "Host" },
  { value: "DRIVER", label: "Driver" },
  { value: "ADMIN", label: "Admin" },
];

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bio: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      suspendedAt: true,
      suspensionReason: true,
      adminNotes: true,
      verificationStatus: true,
      licenseImagePath: true,
      verificationNote: true,
      verifiedAt: true,
      payouts: { select: { id: true, amount: true, method: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 20 },
      listings: {
        select: { id: true, year: true, make: true, model: true, pricePerDay: true, isActive: true, approvalStatus: true },
        orderBy: { createdAt: "desc" },
      },
      bookings: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          totalPrice: true,
          status: true,
          listing: { select: { id: true, year: true, make: true, model: true } },
        },
        orderBy: { startDate: "desc" },
        take: 50,
      },
      reviewsReceived: { select: { rating: true } },
      ridesRequested: { select: { id: true, totalPrice: true, status: true, createdAt: true, pickupAddress: true }, orderBy: { createdAt: "desc" }, take: 20 },
      ridesDriven: { select: { id: true, totalPrice: true, status: true, createdAt: true, pickupAddress: true }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) notFound();

  const [spent, hostEarnings] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", booking: { renterId: user.id } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", booking: { listing: { hostId: user.id } } }, _sum: { amount: true } }),
  ]);

  const rating = user.reviewsReceived.length
    ? (user.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / user.reviewsReceived.length).toFixed(1)
    : "—";
  const isSelf = user.id === admin.id;
  const rides = [...user.ridesDriven.map((r) => ({ ...r, as: "Driver" })), ...user.ridesRequested.map((r) => ({ ...r, as: "Rider" }))].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`User · ${user.id}`}
        title={user.name}
        description={user.email}
        actions={
          isSelf ? (
            <span className="text-[13px] text-slate-500">You can&apos;t change your own role or suspend yourself.</span>
          ) : (
            <>
              <label className="flex items-center gap-3 text-[13px] font-medium text-slate-600">
                Role
                <AdminSelectAction
                  endpoint={`/api/admin/users/${user.id}`}
                  field="role"
                  extraBody={{ action: "role" }}
                  value={user.role}
                  options={ROLE_OPTIONS}
                  confirm={`Change ${user.name}'s role to {value}?`}
                />
              </label>
              {user.suspendedAt ? (
                <AdminActionButton
                  endpoint={`/api/admin/users/${user.id}`}
                  body={{ action: "unsuspend" }}
                  label="Lift suspension"
                  variant="green"
                  confirm={`Let ${user.name} log in again? Their cars will reappear on the marketplace.`}
                />
              ) : (
                <AdminActionButton
                  endpoint={`/api/admin/users/${user.id}`}
                  body={{ action: "suspend" }}
                  label="Suspend"
                  variant="red"
                  promptFor={{
                    field: "reason",
                    message: `Why is ${user.name} being suspended? They'll be logged out and their cars hidden. (Internal — not shown to them.)`,
                  }}
                />
              )}
            </>
          )
        }
      />

      {user.suspendedAt && (
        <Callout tone="danger" title={`Suspended ${dateTime(user.suspendedAt)}`}>
          {user.suspensionReason} They can&apos;t log in, and their cars are hidden from the marketplace.
        </Callout>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Spent on rentals" value={money(spent._sum.amount)} />
        <StatCard label="Host earnings (gross)" value={money(hostEarnings._sum.amount)} />
        <StatCard label="Rating as host" value={rating} hint={`${user.reviewsReceived.length} reviews`} />
        <StatCard label="Vehicles listed" value={user.listings.length} />
      </div>

      <Card title="Profile">
        <div className="grid gap-x-10 md:grid-cols-2">
          <div>
            <DetailRow label="Role">
              <Badge value={user.role} />
            </DetailRow>
            <DetailRow label="Phone">{user.phone || "—"}</DetailRow>
          </div>
          <div>
            <DetailRow label="Joined">{dateTime(user.createdAt)}</DetailRow>
            <DetailRow label="Last updated">{dateTime(user.updatedAt)}</DetailRow>
          </div>
        </div>
        {user.bio && <p className="mt-4 text-[13px] text-slate-600">{user.bio}</p>}
      </Card>

      <Card title="Driver's licence">
        <VerificationReview user={user} />
      </Card>

      {user.listings.length > 0 && (
        <Card title="Vehicles">
          <Table head={["Vehicle", "Price", "Approval", "Visibility"]}>
            {user.listings.map((listing) => (
              <tr key={listing.id}>
                <Td>
                  <TextLink href={`/dashboard/admin/vehicles/${listing.id}`}>
                    {listing.year} {listing.make} {listing.model}
                  </TextLink>
                </Td>
                <Td>{money(listing.pricePerDay)}/day</Td>
                <Td>
                  <Badge value={listing.approvalStatus} />
                </Td>
                <Td>
                  <Badge value={listing.isActive ? "ACTIVE" : "INACTIVE"} />
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Card title="Bookings as renter">
        {user.bookings.length === 0 ? (
          <EmptyState>No bookings.</EmptyState>
        ) : (
          <Table head={["Trip", "Vehicle", "Total", "Status"]}>
            {user.bookings.map((booking) => (
              <tr key={booking.id}>
                <Td>
                  <TextLink href={`/dashboard/admin/bookings/${booking.id}`}>
                    {shortDate(booking.startDate)} → {shortDate(booking.endDate)}
                  </TextLink>
                </Td>
                <Td>
                  {booking.listing.year} {booking.listing.make} {booking.listing.model}
                </Td>
                <Td className="font-medium">{money(booking.totalPrice)}</Td>
                <Td>
                  <Badge value={booking.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {rides.length > 0 && (
        <Card title="Rides">
          <Table head={["Date", "As", "Pickup", "Fare", "Status"]}>
            {rides.map((ride) => (
              <tr key={`${ride.as}-${ride.id}`}>
                <Td>{shortDate(ride.createdAt)}</Td>
                <Td>{ride.as}</Td>
                <Td className="max-w-[280px] truncate">{ride.pickupAddress}</Td>
                <Td className="font-medium">{money(ride.totalPrice)}</Td>
                <Td>
                  <Badge value={ride.status} />
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      {user.payouts.length > 0 && (
        <Card title="Payouts received">
          <Table head={["Date", "Amount", "Paid via"]}>
            {user.payouts.map((payout) => (
              <tr key={payout.id}>
                <Td>{dateTime(payout.createdAt)}</Td>
                <Td className="font-medium">{money(payout.amount)}</Td>
                <Td>{payout.method}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Internal notes">
          <p className="mb-4 text-[13px] text-slate-500">Only admins can see these.</p>
          <AdminForm
            endpoint={`/api/admin/users/${user.id}`}
            extraBody={{ action: "notes" }}
            submitLabel="Save notes"
            fields={[{ name: "adminNotes", label: "Notes", type: "textarea", defaultValue: user.adminNotes ?? "" }]}
          />
        </Card>
        <AuditHistory targetType="USER" targetId={user.id} />
      </div>
    </div>
  );
}
