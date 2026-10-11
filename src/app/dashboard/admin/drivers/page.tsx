import type { Prisma } from "@prisma/client";
import DriverReview from "@/components/admin/DriverReview";
import { Card, EmptyState, FilterBar, PageHeader, Pagination, StatCard, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, oneOf, pageNumber, param, requireAdmin, type SearchParams } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export default async function AdminDriversPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const status = oneOf(param(params, "status"), STATUSES);
  const page = pageNumber(params);

  const where: Prisma.DriverProfileWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { vehiclePlate: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [profiles, total, counts, expiringSoon] = await Promise.all([
    prisma.driverProfile.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, phone: true, verificationStatus: true, _count: { select: { ridesDriven: true } } } } },
      // Pending first, oldest first, so the review queue is fair.
      orderBy: [{ status: "asc" }, { submittedAt: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.driverProfile.count({ where }),
    prisma.driverProfile.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.driverProfile.count({
      where: { status: "APPROVED", insuranceExpiresAt: { lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
    }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="People who applied to drive at /drive. A driver needs a verified licence, valid insurance and your approval before they can take rides."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone={count("PENDING") ? "warn" : "light"} label="Waiting for review" value={count("PENDING")} href="?status=PENDING" />
        <StatCard label="Approved drivers" value={count("APPROVED")} href="?status=APPROVED" />
        <StatCard label="Rejected / revoked" value={count("REJECTED")} href="?status=REJECTED" />
        <StatCard tone={expiringSoon ? "warn" : "light"} label="Insurance expiring ≤ 30 days" value={expiringSoon} hint="They can't take rides once it expires" />
      </div>

      <FilterBar
        search={q}
        placeholder="Search name, email or plate…"
        selects={[
          {
            name: "status",
            value: status ?? "",
            options: [{ value: "", label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))],
          },
        ]}
      />

      {profiles.length === 0 ? (
        <EmptyState>No driver applications match these filters.</EmptyState>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <Card
              key={profile.id}
              title={profile.user.name}
              description={`${profile.user.email}${profile.user.phone ? ` · ${profile.user.phone}` : " · no phone (won't get ride alerts)"} · ${profile.user._count.ridesDriven} rides driven`}
              action={<TextLink href={`/dashboard/admin/users/${profile.user.id}`}>Profile &amp; licence</TextLink>}
            >
              <DriverReview user={profile.user} profile={profile} />
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
