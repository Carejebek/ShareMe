import type { Prisma } from "@prisma/client";
import { describeDetails } from "@/components/admin/AuditHistory";
import { EmptyState, FilterBar, PageHeader, Pagination, Table, Td, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, dateTime, oneOf, pageNumber, param, requireAdmin, type SearchParams } from "@/lib/admin";
import { AUDIT_LABELS, TARGET_HREF } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const TARGETS = ["USER", "LISTING", "BOOKING", "PAYMENT", "PAYOUT", "CLAIM", "REVIEW", "SETTING"] as const;

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const target = oneOf(param(params, "target"), TARGETS);
  const adminId = param(params, "admin");
  const q = param(params, "q");
  const page = pageNumber(params);

  const where: Prisma.AuditLogWhereInput = {
    ...(target ? { targetType: target } : {}),
    ...(adminId ? { adminId } : {}),
    ...(q ? { OR: [{ targetId: q }, { action: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const [entries, total, admins] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { admin: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Every change made by an admin, newest first. Entries can't be edited or deleted." />

      <FilterBar
        search={q}
        placeholder="Record ID or action (e.g. refund)…"
        selects={[
          {
            name: "target",
            value: target ?? "",
            options: [{ value: "", label: "Everything" }, ...TARGETS.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() + "s" }))],
          },
          { name: "admin", value: adminId, options: [{ value: "", label: "All admins" }, ...admins.map((a) => ({ value: a.id, label: a.name }))] },
        ]}
      />

      {entries.length === 0 ? (
        <EmptyState>No admin actions recorded{q || target || adminId ? " for these filters" : " yet"}.</EmptyState>
      ) : (
        <Table head={["When", "Admin", "Action", "Record", "Details"]}>
          {entries.map((entry) => {
            const href = TARGET_HREF[entry.targetType]?.(entry.targetId);
            return (
              <tr key={entry.id}>
                <Td className="whitespace-nowrap text-slate-600">{dateTime(entry.createdAt)}</Td>
                <Td>{entry.admin ? <TextLink href={`/dashboard/admin/users/${entry.admin.id}`}>{entry.admin.name}</TextLink> : "—"}</Td>
                <Td className="font-medium">{AUDIT_LABELS[entry.action] ?? entry.action}</Td>
                <Td>
                  <span className="text-xs text-slate-500">{entry.targetType.toLowerCase()} </span>
                  {href ? <TextLink href={href}>{entry.targetId.slice(0, 10)}…</TextLink> : <span className="font-mono text-xs">{entry.targetId.slice(0, 18)}</span>}
                </Td>
                <Td className="max-w-[360px] break-words text-xs text-slate-500">{describeDetails(entry.details)}</Td>
              </tr>
            );
          })}
        </Table>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
