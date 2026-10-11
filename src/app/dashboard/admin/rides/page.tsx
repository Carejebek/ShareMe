import type { Prisma } from "@prisma/client";
import { AdminActionButton, AdminSelectAction } from "@/components/admin/AdminActions";
import { Badge, Callout, EmptyState, FilterBar, PageHeader, Pagination, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, dateTime, money, oneOf, pageNumber, param, requireAdmin, type SearchParams } from "@/lib/admin";
import { STATUS_LABEL, formatDistance, mapsDirectionsUrl } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { FINAL_STATUSES } from "@/lib/rides";

const STATUSES = ["REQUESTED", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export default async function AdminRidesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const status = oneOf(param(params, "status"), STATUSES);
  const page = pageNumber(params);

  const where: Prisma.RideWhereInput = {
    ...(status ? { status } : {}),
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
    prisma.user.findMany({ where: { role: "DRIVER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.ride.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ride.aggregate({ where: { status: "COMPLETED", paid: false }, _sum: { totalPrice: true }, _count: { _all: true } }),
  ]);

  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const active = count("ACCEPTED") + count("EN_ROUTE") + count("IN_PROGRESS");
  const driverOptions = drivers.map((d) => ({ value: d.id, label: d.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rides"
        description="Chauffeur rides booked through the app. Assign drivers, cancel rides and record cash/card payments."
        actions={
          <TextLink href="/dashboard/dispatch">Open live dispatch board →</TextLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone={count("REQUESTED") ? "warn" : "light"} label="Waiting for a driver" value={count("REQUESTED")} href="?status=REQUESTED" />
        <StatCard label="Active now" value={active} />
        <StatCard label="Completed" value={count("COMPLETED")} href="?status=COMPLETED" />
        <StatCard label="Completed but unpaid" value={money(unpaid._sum.totalPrice)} hint={`${unpaid._count._all} rides`} />
      </div>

      {drivers.length === 0 && (
        <Callout tone="warn" title="No drivers yet">
          Make a user a driver from their profile on the Users page to start assigning rides.
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
                  <a href={mapsDirectionsUrl(ride)} target="_blank" rel="noreferrer" className="hover:text-blue-700">
                    <p className="truncate font-semibold">{ride.pickupAddress}</p>
                    <p className="truncate text-slate-500">→ {ride.dropoffAddress}</p>
                  </a>
                  <p className="text-xs text-slate-400">
                    {formatDistance(ride.distanceMeters)} · ~{ride.durationMinutes} min
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
                  {ride.status === "COMPLETED" && (
                    <p className={`text-xs font-medium ${ride.paid ? "text-emerald-700" : "text-amber-700"}`}>
                      {ride.paid ? "Paid" : "Unpaid"}
                    </p>
                  )}
                </Td>
                <Td>
                  <Badge value={ride.status} label={STATUS_LABEL[ride.status]} />
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    {ride.status === "COMPLETED" && !ride.paid && (
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
