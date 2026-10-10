import type { Prisma } from "@prisma/client";
import { Badge, EmptyState, FilterBar, PageHeader, Pagination, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, money, oneOf, pageNumber, param, requireAdmin, shortDate, type SearchParams } from "@/lib/admin";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL } from "@/lib/claims";
import { prisma } from "@/lib/prisma";

const STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "DENIED"] as const;
const TYPES = ["DAMAGE", "CLEANING", "LATE_RETURN", "FUEL", "TOLLS_TICKETS", "OTHER"] as const;

export default async function AdminClaimsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const status = oneOf(param(params, "status"), STATUSES);
  const type = oneOf(param(params, "type"), TYPES);
  const page = pageNumber(params);

  const where: Prisma.ClaimWhereInput = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(q
      ? {
          OR: [
            { description: { contains: q, mode: "insensitive" } },
            { reporter: { name: { contains: q, mode: "insensitive" } } },
            { booking: { listing: { make: { contains: q, mode: "insensitive" } } } },
            { booking: { listing: { model: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [claims, total, counts] = await Promise.all([
    prisma.claim.findMany({
      where,
      include: {
        reporter: { select: { id: true, name: true } },
        booking: { select: { id: true, renterId: true, listing: { select: { year: true, make: true, model: true } } } },
      },
      // Open claims first, oldest first, so nothing waits too long.
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.claim.count({ where }),
    prisma.claim.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Claims" description="Damage and other trip problems reported by hosts and renters." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone={count("OPEN") ? "warn" : "light"} label="Open" value={count("OPEN")} href="?status=OPEN" />
        <StatCard label="In review" value={count("IN_REVIEW")} href="?status=IN_REVIEW" />
        <StatCard label="Resolved" value={count("RESOLVED")} href="?status=RESOLVED" />
        <StatCard label="Denied" value={count("DENIED")} href="?status=DENIED" />
      </div>

      <FilterBar
        search={q}
        placeholder="Search description, reporter or car…"
        selects={[
          { name: "status", value: status ?? "", options: [{ value: "", label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: CLAIM_STATUS_LABEL[s] }))] },
          { name: "type", value: type ?? "", options: [{ value: "", label: "Any type" }, ...TYPES.map((t) => ({ value: t, label: CLAIM_TYPE_LABEL[t] }))] },
        ]}
      />

      {claims.length === 0 ? (
        <EmptyState>No claims match these filters.</EmptyState>
      ) : (
        <Table head={["Filed", "Type", "Vehicle", "Reported by", "Requested", "Status"]}>
          {claims.map((claim) => (
            <tr key={claim.id} className="hover:bg-neutral-50">
              <Td>
                <TextLink href={`/dashboard/admin/claims/${claim.id}`}>{shortDate(claim.createdAt)}</TextLink>
              </Td>
              <Td className="font-bold">{CLAIM_TYPE_LABEL[claim.type]}</Td>
              <Td>
                {claim.booking.listing.year} {claim.booking.listing.make} {claim.booking.listing.model}
              </Td>
              <Td>
                <TextLink href={`/dashboard/admin/users/${claim.reporter.id}`}>{claim.reporter.name}</TextLink>
                <p className="text-xs text-neutral-500">{claim.reporter.id === claim.booking.renterId ? "Renter" : "Host"}</p>
              </Td>
              <Td className="font-bold">{claim.amountRequested ? money(claim.amountRequested) : "—"}</Td>
              <Td>
                <Badge value={claim.status} label={CLAIM_STATUS_LABEL[claim.status]} />
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
