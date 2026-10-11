import { Badge, Card, EmptyState, FilterBar, PageHeader, Table, Td, TextLink } from "@/components/admin/ui";
import { money, param, requireAdmin, shortDate, type SearchParams } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const LIMIT = 10;

// One search box across users, vehicles and bookings (opened from the top bar).
export default async function AdminSearchPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q").slice(0, 100);

  if (!q) {
    return (
      <div className="space-y-6">
        <PageHeader title="Search" description="Find users, vehicles and bookings by name, email, car or ID." />
        <FilterBar search="" placeholder="Search everything…" />
      </div>
    );
  }

  const text = { contains: q, mode: "insensitive" as const };
  const [users, listings, bookings] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ id: q }, { name: text }, { email: text }, { phone: text }] },
      select: { id: true, name: true, email: true, role: true, suspendedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.listing.findMany({
      where: { OR: [{ id: q }, { title: text }, { make: text }, { model: text }, { city: text }] },
      select: {
        id: true,
        year: true,
        make: true,
        model: true,
        city: true,
        state: true,
        approvalStatus: true,
        host: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.booking.findMany({
      where: {
        OR: [
          { id: q },
          { renter: { OR: [{ name: text }, { email: text }] } },
          { listing: { OR: [{ make: text }, { model: text }] } },
        ],
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        totalPrice: true,
        status: true,
        renter: { select: { id: true, name: true } },
        listing: { select: { year: true, make: true, model: true } },
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
  ]);
  const total = users.length + listings.length + bookings.length;
  const more = (n: number) => (n === LIMIT ? `Showing the first ${LIMIT}` : `${n} result${n === 1 ? "" : "s"}`);

  return (
    <div className="space-y-6">
      <PageHeader title={`Results for “${q}”`} description={`${total} match${total === 1 ? "" : "es"} across users, vehicles and bookings.`} />
      <FilterBar search={q} placeholder="Search everything…" />

      {total === 0 && <EmptyState>Nothing matched. Try a name, email, make, model, city or a full record ID.</EmptyState>}

      {users.length > 0 && (
        <Card title="Users" description={more(users.length)} action={<TextLink href={`/dashboard/admin/users?q=${encodeURIComponent(q)}`}>Open in Users</TextLink>}>
          <Table head={["Name", "Email", "Role", "Joined"]}>
            {users.map((user) => (
              <tr key={user.id}>
                <Td>
                  <TextLink href={`/dashboard/admin/users/${user.id}`}>{user.name}</TextLink>
                </Td>
                <Td className="text-slate-500">{user.email}</Td>
                <Td>{user.suspendedAt ? <Badge value="SUSPENDED" /> : <Badge value={user.role} />}</Td>
                <Td className="text-slate-500">{shortDate(user.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {listings.length > 0 && (
        <Card title="Vehicles" description={more(listings.length)} action={<TextLink href={`/dashboard/admin/vehicles?q=${encodeURIComponent(q)}`}>Open in Vehicles</TextLink>}>
          <Table head={["Vehicle", "Location", "Host", "Approval"]}>
            {listings.map((listing) => (
              <tr key={listing.id}>
                <Td>
                  <TextLink href={`/dashboard/admin/vehicles/${listing.id}`}>
                    {listing.year} {listing.make} {listing.model}
                  </TextLink>
                </Td>
                <Td className="text-slate-500">
                  {listing.city}, {listing.state}
                </Td>
                <Td>
                  <TextLink href={`/dashboard/admin/users/${listing.host.id}`}>{listing.host.name}</TextLink>
                </Td>
                <Td>
                  <Badge value={listing.approvalStatus} />
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {bookings.length > 0 && (
        <Card title="Bookings" description={more(bookings.length)} action={<TextLink href={`/dashboard/admin/bookings?q=${encodeURIComponent(q)}`}>Open in Bookings</TextLink>}>
          <Table head={["Vehicle", "Renter", "Trip dates", "Total", "Status"]}>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <Td>
                  <TextLink href={`/dashboard/admin/bookings/${booking.id}`}>
                    {booking.listing.year} {booking.listing.make} {booking.listing.model}
                  </TextLink>
                </Td>
                <Td>
                  <TextLink href={`/dashboard/admin/users/${booking.renter.id}`}>{booking.renter.name}</TextLink>
                </Td>
                <Td className="whitespace-nowrap text-slate-500">
                  {shortDate(booking.startDate)} – {shortDate(booking.endDate)}
                </Td>
                <Td className="font-medium tabular-nums">{money(booking.totalPrice)}</Td>
                <Td>
                  <Badge value={booking.status} />
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
