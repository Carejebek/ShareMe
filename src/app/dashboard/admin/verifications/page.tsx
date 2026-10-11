import { Card, EmptyState, PageHeader, StatCard, TextLink } from "@/components/admin/ui";
import VerificationReview from "@/components/admin/VerificationReview";
import { dateTime, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminVerificationsPage() {
  await requireAdmin();

  const [pending, counts, unverifiedHostsWithCars] = await Promise.all([
    prisma.user.findMany({
      where: { verificationStatus: "PENDING" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
        verificationStatus: true,
        licenseImagePath: true,
        verificationNote: true,
        verifiedAt: true,
        _count: { select: { listings: true } },
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.user.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
    prisma.user.count({ where: { verificationStatus: { not: "VERIFIED" }, listings: { some: {} } } }),
  ]);
  const count = (s: string) => counts.find((c) => c.verificationStatus === s)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licence verifications"
        description="Hosts must have a verified driver's licence before any of their cars can be approved."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone={pending.length ? "warn" : "light"} label="Waiting for review" value={pending.length} />
        <StatCard label="Verified" value={count("VERIFIED")} />
        <StatCard label="Rejected" value={count("REJECTED")} />
        <StatCard label="Hosts with cars, not verified" value={unverifiedHostsWithCars} href="/dashboard/admin/users?verification=UNVERIFIED" />
      </div>

      {pending.length === 0 ? (
        <EmptyState>No licences waiting for review.</EmptyState>
      ) : (
        pending.map((user) => (
          <Card
            key={user.id}
            title={user.name}
            action={
              <span className="text-[13px] text-slate-500">
                {user.email} · {user._count.listings} car{user._count.listings === 1 ? "" : "s"} · submitted {dateTime(user.updatedAt)} ·{" "}
                <TextLink href={`/dashboard/admin/users/${user.id}`}>Profile →</TextLink>
              </span>
            }
          >
            <VerificationReview user={user} />
          </Card>
        ))
      )}
    </div>
  );
}
