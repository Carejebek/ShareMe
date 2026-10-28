import type { Prisma } from "@prisma/client";
import { EmptyState, FilterBar, PageHeader, Pagination, StatCard, Table, Td } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, dateTime, oneOf, pageNumber, param, requireAdmin, type SearchParams } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { WAITLIST_INTEREST_LABEL, WAITLIST_INTERESTS } from "@/lib/waitlist";

const INTERESTS = WAITLIST_INTERESTS.map((i) => i.value);
const DAY = 24 * 60 * 60 * 1000;

export default async function AdminWaitlistPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const interest = oneOf(param(params, "interest"), INTERESTS);
  const page = pageNumber(params);

  const where: Prisma.WaitlistEntryWhereInput = {
    ...(interest ? { interest } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const [entries, total, all, lastWeek, byInterest] = await Promise.all([
    prisma.waitlistEntry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE }),
    prisma.waitlistEntry.count({ where }),
    prisma.waitlistEntry.count(),
    prisma.waitlistEntry.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * DAY) } } }),
    prisma.waitlistEntry.groupBy({ by: ["interest"], _count: { _all: true } }),
  ]);
  const top = [...byInterest].sort((a, b) => b._count._all - a._count._all)[0];
  const exportQuery = new URLSearchParams({ ...(q ? { q } : {}), ...(interest ? { interest } : {}) }).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waitlist"
        description="Visitors who signed up on /waitlist to hear when JayXZ is ready for them."
        actions={
          <a
            href={`/api/admin/waitlist/export${exportQuery ? `?${exportQuery}` : ""}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon="inbox" label="Total signups" value={all} />
        <StatCard label="Last 7 days" value={lastWeek} />
        <StatCard
          label="Most wanted"
          value={top ? WAITLIST_INTEREST_LABEL[top.interest] : "—"}
          hint={top ? `${top._count._all} signups` : undefined}
          href={top ? `?interest=${top.interest}` : undefined}
        />
      </div>

      <FilterBar
        search={q}
        placeholder="Search name, email, phone or city…"
        selects={[
          {
            name: "interest",
            value: interest ?? "",
            options: [{ value: "", label: "Any interest" }, ...WAITLIST_INTERESTS.map((i) => ({ value: i.value, label: i.label }))],
          },
        ]}
      />

      {entries.length === 0 ? (
        <EmptyState>No signups yet.</EmptyState>
      ) : (
        <Table head={["Joined", "Name", "Email", "Mobile", "City", "Interest"]}>
          {entries.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap text-slate-500">{dateTime(e.createdAt)}</Td>
              <Td className="font-medium text-slate-900">{e.name}</Td>
              <Td>
                <a href={`mailto:${e.email}`} className="text-[#e64a19] hover:underline">
                  {e.email}
                </a>
              </Td>
              <Td className="whitespace-nowrap font-mono text-xs">{e.phone || "—"}</Td>
              <Td>{e.city || "—"}</Td>
              <Td className="whitespace-nowrap">{WAITLIST_INTEREST_LABEL[e.interest]}</Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
