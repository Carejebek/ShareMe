import type { Prisma } from "@prisma/client";
import { AdminActionButton } from "@/components/admin/AdminActions";
import DriverReview from "@/components/admin/DriverReview";
import { Badge, Card, EmptyState, FilterBar, PageHeader, Pagination, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, dateTime, oneOf, pageNumber, param, requireAdmin, shortDate, type SearchParams } from "@/lib/admin";
import { EXPIRY_WARNING_DAYS, daysLeft, reminderStage, sentStage } from "@/lib/driverDocs";
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

  const now = new Date();
  const [profiles, total, counts, expiring] = await Promise.all([
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
    // Approved drivers whose insurance has lapsed or lapses within 30 days, soonest first.
    prisma.driverProfile.findMany({
      where: { status: "APPROVED", insuranceExpiresAt: { lt: new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000) } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            suspendedAt: true,
            ridesDriven: {
              where: { status: { in: ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS"] } },
              select: { id: true, scheduledAt: true },
            },
          },
        },
      },
      orderBy: { insuranceExpiresAt: "asc" },
      take: 100,
    }),
  ]);
  const expiringSoon = expiring.length;
  const expiredCount = expiring.filter((p) => p.insuranceExpiresAt < now).length;
  // Sent reminder texts for these drivers, to show when each was last texted.
  const lastTexts = expiring.length
    ? await prisma.smsMessage.findMany({
        where: { event: "driver.insurance", userId: { in: expiring.map((p) => p.userId) } },
        select: { userId: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
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
        <StatCard
          tone={expiredCount ? "warn" : "light"}
          label="Insurance expired or expiring ≤ 30 days"
          value={expiringSoon}
          hint={expiredCount ? `${expiredCount} already expired and can't take rides` : "They can't take rides once it expires"}
          href="#insurance"
        />
      </div>

      {expiring.length > 0 && (
        <div id="insurance">
          <Card
            title="Insurance expiring or expired"
            description="Drivers are texted automatically 30, 7 and 1 day before, and when it expires. They're blocked from rides once it lapses, and the reminders start over when they upload new insurance."
          >
            <Table head={["Driver", "Insurance", "Reminders", "Rides at risk", ""]}>
              {expiring.map((p) => {
                const left = daysLeft(p.insuranceExpiresAt, now);
                const expired = p.insuranceExpiresAt < now;
                const sent = sentStage(p);
                const last = lastTexts.find((t) => t.userId === p.userId);
                // Assigned rides that happen after the insurance lapses (the driver can't take new ones but keeps these).
                const atRisk = p.user.ridesDriven.filter((r) => (r.scheduledAt ?? now) >= p.insuranceExpiresAt);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td>
                      <TextLink href={`/dashboard/admin/users/${p.user.id}`}>{p.user.name}</TextLink>
                      <p className="text-xs text-slate-500">
                        {p.vehiclePlate} · {p.user.phone || <span className="text-rose-600">no phone, can&apos;t be texted</span>}
                      </p>
                    </Td>
                    <Td>
                      <Badge value={expired ? "REJECTED" : left <= 7 ? "PENDING" : "IN_REVIEW"} label={expired ? "Expired" : left === 1 ? "1 day left" : `${left} days left`} />
                      <p className="mt-1 text-xs text-slate-500">{shortDate(p.insuranceExpiresAt)}</p>
                    </Td>
                    <Td className="text-xs text-slate-600">
                      {sent === null ? "None sent yet" : sent === 0 ? "Expiry notice sent" : `${sent}-day reminder sent`}
                      {last && (
                        <p className="text-slate-400">
                          Last text {dateTime(last.createdAt)} · {last.status}
                        </p>
                      )}
                    </Td>
                    <Td>
                      {atRisk.length > 0 ? (
                        <span className="text-[13px] font-semibold text-rose-600">
                          {atRisk.length} assigned ride{atRisk.length === 1 ? "" : "s"} after expiry
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {atRisk.slice(0, 3).map((r) => (
                        <p key={r.id} className="text-xs">
                          <TextLink href={`/dashboard/admin/rides/${r.id}`}>{r.scheduledAt ? dateTime(r.scheduledAt) : "Now"}</TextLink>
                        </p>
                      ))}
                    </Td>
                    <Td>
                      {p.user.phone && reminderStage(p.insuranceExpiresAt, now) !== null && (
                        <AdminActionButton
                          endpoint={`/api/admin/drivers/${p.id}/remind`}
                          method="POST"
                          label="Text reminder"
                          variant="outline"
                          successMessage="Sent"
                        />
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        </div>
      )}

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
