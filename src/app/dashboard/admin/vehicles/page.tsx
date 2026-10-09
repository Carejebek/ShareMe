import type { Prisma } from "@prisma/client";
import { AdminActionButton } from "@/components/admin/AdminActions";
import { Badge, EmptyState, FilterBar, PageHeader, Pagination, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, money, oneOf, pageNumber, param, requireAdmin, shortDate, type SearchParams } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const APPROVALS = ["PENDING", "APPROVED", "REJECTED"] as const;

export default async function AdminVehiclesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const approval = oneOf(param(params, "approval"), APPROVALS);
  const visibility = param(params, "visibility");
  const page = pageNumber(params);

  const where: Prisma.ListingWhereInput = {
    ...(approval ? { approvalStatus: approval } : {}),
    ...(visibility === "active" ? { isActive: true } : visibility === "inactive" ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { make: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { host: { name: { contains: q, mode: "insensitive" } } },
            { host: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [listings, total, counts] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        host: { select: { id: true, name: true } },
        _count: { select: { bookings: true } },
      },
      // Pending first so the review queue is always at the top.
      orderBy: [{ approvalStatus: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.listing.count({ where }),
    prisma.listing.groupBy({ by: ["approvalStatus"], _count: { _all: true } }),
  ]);

  const count = (status: string) => counts.find((c) => c.approvalStatus === status)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Vehicles" description="Approve new cars, take listings offline and inspect any vehicle on the platform." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="warn" label="Pending approval" value={count("PENDING")} href="?approval=PENDING" />
        <StatCard label="Approved" value={count("APPROVED")} href="?approval=APPROVED" />
        <StatCard label="Rejected" value={count("REJECTED")} href="?approval=REJECTED" />
      </div>

      <FilterBar
        search={q}
        placeholder="Search make, model, city or host…"
        selects={[
          {
            name: "approval",
            value: approval ?? "",
            options: [
              { value: "", label: "Any approval" },
              ...APPROVALS.map((a) => ({ value: a, label: a.charAt(0) + a.slice(1).toLowerCase() })),
            ],
          },
          {
            name: "visibility",
            value: visibility,
            options: [
              { value: "", label: "Active & inactive" },
              { value: "active", label: "Active only" },
              { value: "inactive", label: "Inactive only" },
            ],
          },
        ]}
      />

      {listings.length === 0 ? (
        <EmptyState>No vehicles match these filters.</EmptyState>
      ) : (
        <Table head={["Vehicle", "Host", "Price", "Bookings", "Status", "Listed", "Actions"]}>
          {listings.map((listing) => (
            <tr key={listing.id} className="hover:bg-neutral-50">
              <Td>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={listing.imageUrls[0] || "/images/shareme-hero.jpg"}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div>
                    <TextLink href={`/dashboard/admin/vehicles/${listing.id}`}>
                      {listing.year} {listing.make} {listing.model}
                    </TextLink>
                    <p className="text-xs text-neutral-500">
                      {listing.city}, {listing.state}
                    </p>
                  </div>
                </div>
              </Td>
              <Td>
                <TextLink href={`/dashboard/admin/users/${listing.host.id}`}>{listing.host.name}</TextLink>
              </Td>
              <Td className="font-bold">{money(listing.pricePerDay)}/day</Td>
              <Td>{listing._count.bookings}</Td>
              <Td>
                <div className="flex flex-col items-start gap-1">
                  <Badge value={listing.approvalStatus} />
                  <Badge value={listing.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>
              </Td>
              <Td className="text-neutral-500">{shortDate(listing.createdAt)}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  {listing.approvalStatus !== "APPROVED" && (
                    <AdminActionButton
                      endpoint={`/api/admin/listings/${listing.id}/approval`}
                      body={{ status: "APPROVED" }}
                      label="Approve"
                      variant="green"
                    />
                  )}
                  {listing.approvalStatus !== "REJECTED" && (
                    <AdminActionButton
                      endpoint={`/api/admin/listings/${listing.id}/approval`}
                      body={{ status: "REJECTED" }}
                      label="Reject"
                      variant="outline"
                      confirm={`Reject the ${listing.make} ${listing.model}? It will be hidden from the marketplace.`}
                    />
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
