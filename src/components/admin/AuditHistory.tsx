import { Card, EmptyState } from "@/components/admin/ui";
import { dateTime } from "@/lib/admin";
import { AUDIT_LABELS, type AuditTarget } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export function describeDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  return Object.entries(details as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}

// "History" card for an admin detail page: every admin action on this record.
export default async function AuditHistory({ targetType, targetId }: { targetType: AuditTarget; targetId: string }) {
  const entries = await prisma.auditLog.findMany({
    where: { targetType, targetId },
    include: { admin: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <Card title="Admin history">
      {entries.length === 0 ? (
        <EmptyState>No admin actions recorded yet.</EmptyState>
      ) : (
        <ol className="relative space-y-4 text-[13px] before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-slate-200">
          {entries.map((entry) => (
            <li key={entry.id} className="relative pl-6">
              <span className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-white bg-slate-400 ring-1 ring-slate-200" />
              <p className="text-slate-900">
                <span className="font-medium">{AUDIT_LABELS[entry.action] ?? entry.action}</span>
              </p>
              <p className="text-xs text-slate-500">
                {entry.admin?.name ?? "Deleted admin"} · {dateTime(entry.createdAt)}
              </p>
              {entry.details && <p className="mt-1 break-words font-mono text-[11px] text-slate-500">{describeDetails(entry.details)}</p>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
