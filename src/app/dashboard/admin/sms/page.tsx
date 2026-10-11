import type { Prisma } from "@prisma/client";
import { Badge, EmptyState, FilterBar, PageHeader, Pagination, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, dateTime, oneOf, pageNumber, param, requireAdmin, type SearchParams } from "@/lib/admin";
import { SMS_EVENTS } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

const STATUSES = ["queued", "sent", "delivered", "undelivered", "failed", "skipped"] as const;
const EVENTS = [...Object.keys(SMS_EVENTS), "test"];
const DAY = 24 * 60 * 60 * 1000;

// Twilio's lowercase statuses mapped onto the portal's badge colours.
const STATUS_BADGE: Record<string, string> = {
  queued: "PENDING",
  accepted: "PENDING",
  sending: "PENDING",
  sent: "CONFIRMED",
  delivered: "COMPLETED",
  read: "COMPLETED",
  undelivered: "FAILED",
  failed: "FAILED",
  skipped: "CANCELLED",
};

export default async function AdminSmsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const status = oneOf(param(params, "status"), STATUSES);
  const event = oneOf(param(params, "event"), EVENTS);
  const page = pageNumber(params);

  const where: Prisma.SmsMessageWhereInput = {
    ...(status ? { status } : {}),
    ...(event ? { event } : {}),
    ...(q ? { OR: [{ to: { contains: q } }, { body: { contains: q, mode: "insensitive" } }, { user: { name: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const since = new Date(Date.now() - 30 * DAY);

  const [messages, total, byStatus] = await Promise.all([
    prisma.smsMessage.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.smsMessage.count({ where }),
    prisma.smsMessage.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
  ]);
  const count = (...s: string[]) => byStatus.filter((b) => s.includes(b.status)).reduce((sum, b) => sum + b._count._all, 0);
  const attempted = count("queued", "accepted", "sending", "sent", "delivered", "read", "undelivered", "failed");
  const delivered = count("delivered", "read");
  const failed = count("undelivered", "failed");

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMS log"
        description="Every text the platform has sent through Twilio, with its delivery status."
        actions={<TextLink href="/dashboard/admin/integrations">SMS settings</TextLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="message" label="Sent · 30 days" value={attempted} />
        <StatCard
          label="Delivered"
          value={delivered}
          hint={attempted ? `${Math.round((delivered / attempted) * 100)}% delivery rate` : undefined}
          href="?status=delivered"
        />
        <StatCard tone={failed ? "warn" : "light"} label="Failed or undelivered" value={failed} href="?status=failed" />
        <StatCard label="Skipped (bad number)" value={count("skipped")} href="?status=skipped" hint="Users without a valid phone number" />
      </div>

      <FilterBar
        search={q}
        placeholder="Search number, message or user…"
        selects={[
          { name: "status", value: status ?? "", options: [{ value: "", label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))] },
          { name: "event", value: event ?? "", options: [{ value: "", label: "Any event" }, ...EVENTS.map((e) => ({ value: e, label: e }))] },
        ]}
      />

      {messages.length === 0 ? (
        <EmptyState>No messages yet.</EmptyState>
      ) : (
        <Table head={["Sent", "To", "Event", "Message", "Status"]}>
          {messages.map((m) => (
            <tr key={m.id}>
              <Td className="whitespace-nowrap text-slate-500">{dateTime(m.createdAt)}</Td>
              <Td className="whitespace-nowrap">
                <span className="font-mono text-xs">{m.to || "—"}</span>
                {m.user && (
                  <span className="block text-xs">
                    <TextLink href={`/dashboard/admin/users/${m.user.id}`}>{m.user.name}</TextLink>
                  </span>
                )}
              </Td>
              <Td className="whitespace-nowrap font-mono text-xs text-slate-500">{m.event}</Td>
              <Td className="max-w-[420px] text-slate-600">
                <span className="line-clamp-2">{m.body}</span>
              </Td>
              <Td>
                <Badge value={STATUS_BADGE[m.status] ?? "PENDING"} label={m.status} />
                {m.error && <span className="mt-1 block max-w-[220px] text-xs text-rose-600">{m.error}</span>}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
