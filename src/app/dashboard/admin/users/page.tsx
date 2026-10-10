import type { Prisma } from "@prisma/client";
import { Badge, EmptyState, FilterBar, PageHeader, Pagination, StatCard, Table, Td, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, oneOf, pageNumber, param, requireAdmin, shortDate, type SearchParams } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const ROLES = ["RENTER", "HOST", "DRIVER", "ADMIN"] as const;
const VERIFICATION = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const role = oneOf(param(params, "role"), ROLES);
  const verification = oneOf(param(params, "verification"), VERIFICATION);
  const account = param(params, "account");
  const page = pageNumber(params);

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(verification ? { verificationStatus: verification } : {}),
    ...(account === "suspended" ? { suspendedAt: { not: null } } : account === "active" ? { suspendedAt: null } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const [users, total, roles] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        suspendedAt: true,
        verificationStatus: true,
        _count: { select: { listings: true, bookings: true, ridesDriven: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  const count = (r: string) => roles.find((x) => x.role === r)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Renters, hosts, drivers and admins. Open a profile to see their activity or change their role." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Renters" value={count("RENTER")} href="?role=RENTER" />
        <StatCard label="Hosts" value={count("HOST")} href="?role=HOST" />
        <StatCard label="Drivers" value={count("DRIVER")} href="?role=DRIVER" />
        <StatCard tone="dark" label="Admins" value={count("ADMIN")} href="?role=ADMIN" />
      </div>

      <FilterBar
        search={q}
        placeholder="Search name, email or phone…"
        selects={[
          {
            name: "role",
            value: role ?? "",
            options: [
              { value: "", label: "All roles" },
              ...ROLES.map((r) => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() })),
            ],
          },
          {
            name: "verification",
            value: verification ?? "",
            options: [
              { value: "", label: "Any licence status" },
              ...VERIFICATION.map((v) => ({ value: v, label: `Licence: ${v.charAt(0) + v.slice(1).toLowerCase()}` })),
            ],
          },
          {
            name: "account",
            value: account,
            options: [
              { value: "", label: "Active & suspended" },
              { value: "active", label: "Active only" },
              { value: "suspended", label: "Suspended only" },
            ],
          },
        ]}
      />

      {users.length === 0 ? (
        <EmptyState>No users match these filters.</EmptyState>
      ) : (
        <Table head={["User", "Phone", "Role", "Licence", "Vehicles", "Bookings", "Rides driven", "Joined"]}>
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-neutral-50">
              <Td>
                <TextLink href={`/dashboard/admin/users/${user.id}`}>{user.name}</TextLink>
                <p className="text-xs text-neutral-500">{user.email}</p>
              </Td>
              <Td className="text-neutral-600">{user.phone || "—"}</Td>
              <Td>
                <div className="flex flex-col items-start gap-1">
                  <Badge value={user.role} />
                  {user.suspendedAt && <Badge value="SUSPENDED" />}
                </div>
              </Td>
              <Td>
                <Badge value={user.verificationStatus} />
              </Td>
              <Td>{user._count.listings}</Td>
              <Td>{user._count.bookings}</Td>
              <Td>{user._count.ridesDriven}</Td>
              <Td className="text-neutral-500">{shortDate(user.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
