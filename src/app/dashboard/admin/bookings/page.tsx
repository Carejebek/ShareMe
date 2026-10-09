import type { Prisma } from "@prisma/client";
import { Badge, EmptyState, FilterBar, PageHeader, Pagination, Table, Td, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, money, oneOf, pageNumber, param, requireAdmin, shortDate, type SearchParams } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export default async function AdminBookingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const status = oneOf(param(params, "status"), STATUSES);
  const when = param(params, "when");
  const page = pageNumber(params);
  const now = new Date();

  const where: Prisma.BookingWhereInput = {
    ...(status ? { status } : {}),
    ...(when === "upcoming"
      ? { startDate: { gt: now } }
      : when === "ongoing"
        ? { startDate: { lte: now }, endDate: { gte: now } }
        : when === "past"
          ? { endDate: { lt: now } }
          : {}),
    ...(q
      ? {
          OR: [
            { id: q },
            { renter: { name: { contains: q, mode: "insensitive" } } },
            { renter: { email: { contains: q, mode: "insensitive" } } },
            { listing: { make: { contains: q, mode: "insensitive" } } },
            { listing: { model: { contains: q, mode: "insensitive" } } },
            { listing: { host: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        listing: { select: { id: true, year: true, make: true, model: true, host: { select: { id: true, name: true } } } },
        renter: { select: { id: true, name: true } },
        payment: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.booking.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Bookings" description="Every rental on the platform — search, filter and step in when needed." />

      <FilterBar
        search={q}
        placeholder="Search renter, host, car or booking ID…"
        selects={[
          {
            name: "status",
            value: status ?? "",
            options: [
              { value: "", label: "Any status" },
              ...STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() })),
            ],
          },
          {
            name: "when",
            value: when,
            options: [
              { value: "", label: "Any time" },
              { value: "upcoming", label: "Upcoming" },
              { value: "ongoing", label: "Happening now" },
              { value: "past", label: "Past" },
            ],
          },
        ]}
      />

      {bookings.length === 0 ? (
        <EmptyState>No bookings match these filters.</EmptyState>
      ) : (
        <Table head={["Trip", "Vehicle", "Renter", "Host", "Total", "Booking", "Payment", "Created"]}>
          {bookings.map((booking) => (
            <tr key={booking.id} className="hover:bg-neutral-50">
              <Td>
                <TextLink href={`/dashboard/admin/bookings/${booking.id}`}>
                  {shortDate(booking.startDate)} → {shortDate(booking.endDate)}
                </TextLink>
              </Td>
              <Td>
                <TextLink href={`/dashboard/admin/vehicles/${booking.listing.id}`}>
                  {booking.listing.year} {booking.listing.make} {booking.listing.model}
                </TextLink>
              </Td>
              <Td>
                <TextLink href={`/dashboard/admin/users/${booking.renter.id}`}>{booking.renter.name}</TextLink>
              </Td>
              <Td>
                <TextLink href={`/dashboard/admin/users/${booking.listing.host.id}`}>{booking.listing.host.name}</TextLink>
              </Td>
              <Td className="font-bold">{money(booking.totalPrice)}</Td>
              <Td>
                <Badge value={booking.status} />
              </Td>
              <Td>{booking.payment ? <Badge value={booking.payment.status} /> : <span className="text-neutral-400">None</span>}</Td>
              <Td className="text-neutral-500">{shortDate(booking.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
