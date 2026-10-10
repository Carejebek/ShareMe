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
        <ul className="space-y-3 text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className="border-l-2 border-neutral-200 pl-4">
              <p>
                <span className="font-bold">{AUDIT_LABELS[entry.action] ?? entry.action}</span>{" "}
                <span className="text-neutral-500">
                  by {entry.admin?.name ?? "deleted admin"} · {dateTime(entry.createdAt)}
                </span>
              </p>
              {entry.details && <p className="mt-0.5 break-words text-neutral-500">{describeDetails(entry.details)}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
