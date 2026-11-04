import type { Prisma } from "@prisma/client";
import { AdminActionButton, AdminSelectAction } from "@/components/admin/AdminActions";
import { Badge, Callout, EmptyState, FilterBar, PageHeader, Pagination, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, dateTime, money, oneOf, pageNumber, param, requireAdmin, type SearchParams } from "@/lib/admin";
import { STATUS_LABEL, formatDistance, mapsDirectionsUrl } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { activeDriverWhere } from "@/lib/drivers";
import { FINAL_STATUSES } from "@/lib/rides";

const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: "Not paid",
  CASH: "Paid (cash)",
  AUTHORIZED: "Card on hold",
  CAPTURED: "Charged",
  RELEASED: "Hold released",
  FAILED: "Charge failed",
};

const STATUSES = ["REQUESTED", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export default async function AdminRidesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const status = oneOf(param(params, "status"), STATUSES);
  const page = pageNumber(params);

  const where: Prisma.RideWhereInput = {
    // Unfinished checkouts aren't real rides yet.
    ...(status ? { status } : { status: { not: "AWAITING_PAYMENT" } }),
    ...(q
      ? {
          OR: [
            { pickupAddress: { contains: q, mode: "insensitive" } },
            { dropoffAddress: { contains: q, mode: "insensitive" } },
            { rider: { name: { contains: q, mode: "insensitive" } } },
            { driver: { name: { contains: q, mode: "insensitive" } } },
            { riderPhone: { contains: q } },
          ],
        }
      : {}),
  };

  const [rides, total, drivers, byStatus, unpaid] = await Promise.all([
    prisma.ride.findMany({
      where,
      include: {
        rider: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.ride.count({ where }),
    prisma.user.findMany({ where: activeDriverWhere(), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.ride.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ride.aggregate({
      where: { status: "COMPLETED", paymentStatus: { in: ["CAPTURED"] } },
      _sum: { totalPrice: true, platformFee: true },
      _count: { _all: true },
    }),
  ]);

  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const active = count("ACCEPTED") + count("EN_ROUTE") + count("IN_PROGRESS");
  const driverOptions = drivers.map((d) => ({ value: d.id, label: d.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rides"
        description="Rides booked through the app. The rider's card is held when they book and charged when the trip is completed."
        actions={
          <TextLink href="/dashboard/dispatch">Open live dispatch board →</TextLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone={count("REQUESTED") ? "warn" : "light"} label="Waiting for a driver" value={count("REQUESTED")} href="?status=REQUESTED" />
        <StatCard label="Active now" value={active} />
        <StatCard label="Completed" value={count("COMPLETED")} href="?status=COMPLETED" />
        <StatCard
          label="Charged to riders"
          value={money(unpaid._sum.totalPrice)}
          hint={`${unpaid._count._all} rides · ${money(unpaid._sum.platformFee)} platform fees`}
        />
      </div>

      {drivers.length === 0 && (
        <Callout tone="warn" title="No approved drivers yet">
          People apply to drive at <TextLink href="/drive">/drive</TextLink>. Review applications on the{" "}
          <TextLink href="/dashboard/admin/drivers">Drivers</TextLink> page.
        </Callout>
      )}

      <FilterBar
        search={q}
        placeholder="Search address, rider, driver or phone…"
        selects={[
          {
            name: "status",
            value: status ?? "",
            options: [{ value: "", label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))],
          },
        ]}
      />

      {rides.length === 0 ? (
        <EmptyState>No rides match these filters.</EmptyState>
      ) : (
        <Table head={["When", "Route", "Rider", "Driver", "Fare", "Status", "Actions"]}>
          {rides.map((ride) => {
            const finished = FINAL_STATUSES.includes(ride.status);
            const canAssign = ride.status === "REQUESTED" || ride.status === "ACCEPTED";
            return (
              <tr key={ride.id} className="hover:bg-slate-50">
                <Td className="text-slate-600">
                  {ride.scheduledAt ? dateTime(ride.scheduledAt) : <span className="font-medium text-blue-700">ASAP</span>}
                  <p className="text-xs text-slate-400">booked {dateTime(ride.createdAt)}</p>
                </Td>
                <Td className="max-w-[300px]">
                  <a href={`/dashboard/admin/rides/${ride.id}`} className="hover:text-blue-700">
                    <p className="truncate font-semibold">{ride.pickupAddress}</p>
                    <p className="truncate text-slate-500">→ {ride.dropoffAddress}</p>
                  </a>
                  <p className="text-xs text-slate-400">
                    {formatDistance(ride.distanceMeters)} · ~{ride.durationMinutes} min ·{" "}
                    <a href={mapsDirectionsUrl(ride)} target="_blank" rel="noreferrer" className="hover:text-blue-700">
                      map
                    </a>
                  </p>
                </Td>
                <Td>
                  <TextLink href={`/dashboard/admin/users/${ride.rider.id}`}>{ride.rider.name}</TextLink>
                  <p className="text-xs text-slate-500">{ride.riderPhone}</p>
                </Td>
                <Td>
                  {canAssign && drivers.length > 0 ? (
                    <AdminSelectAction
                      endpoint={`/api/rides/${ride.id}`}
                      field="driverId"
                      extraBody={{ action: "assign" }}
                      value={ride.driver?.id ?? ""}
                      placeholder="Assign driver…"
                      options={driverOptions}
                    />
                  ) : ride.driver ? (
                    <TextLink href={`/dashboard/admin/users/${ride.driver.id}`}>{ride.driver.name}</TextLink>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </Td>
                <Td>
                  <span className="font-semibold">{money(ride.totalPrice)}</span>
                  <p
                    className={`text-xs font-medium ${
                      ride.paymentStatus === "CAPTURED" || ride.paid
                        ? "text-emerald-700"
                        : ride.paymentStatus === "FAILED"
                          ? "text-rose-600"
                          : "text-slate-500"
                    }`}
                  >
                    {PAYMENT_LABEL[ride.paymentStatus === "UNPAID" && ride.paid ? "CASH" : ride.paymentStatus]}
                  </p>
                  {Number(ride.refundedAmount) > 0 && <p className="text-xs text-amber-700">Refunded {money(ride.refundedAmount)}</p>}
                  {ride.cancelReason && <p className="text-xs text-slate-400">{ride.cancelReason}</p>}
                </Td>
                <Td>
                  <Badge value={ride.status} label={STATUS_LABEL[ride.status]} />
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <TextLink href={`/dashboard/admin/rides/${ride.id}`}>Details</TextLink>
                    {ride.status === "COMPLETED" && !ride.paid && ride.paymentStatus === "UNPAID" && (
                      <AdminActionButton
                        endpoint={`/api/rides/${ride.id}`}
                        body={{ action: "markPaid" }}
                        label="Mark paid"
                        variant="green"
                      />
                    )}
                    {!finished && (
                      <AdminActionButton
                        endpoint={`/api/rides/${ride.id}`}
                        body={{ action: "cancel" }}
                        label="Cancel"
                        variant="outline"
                        confirm="Cancel this ride?"
                      />
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
