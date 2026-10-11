import type { Prisma } from "@prisma/client";
import { AdminActionButton } from "@/components/admin/AdminActions";
import { EmptyState, FilterBar, PageHeader, Pagination, StatCard, TextLink } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, pageNumber, param, requireAdmin, shortDate, type SearchParams } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = param(params, "q");
  const rating = Number.parseInt(param(params, "rating"), 10);
  const page = pageNumber(params);

  const where: Prisma.ReviewWhereInput = {
    ...(rating >= 1 && rating <= 5 ? { rating } : {}),
    ...(q
      ? {
          OR: [
            { comment: { contains: q, mode: "insensitive" } },
            { author: { name: { contains: q, mode: "insensitive" } } },
            { target: { name: { contains: q, mode: "insensitive" } } },
            { listing: { make: { contains: q, mode: "insensitive" } } },
            { listing: { model: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [reviews, total, stats] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        target: { select: { id: true, name: true } },
        listing: { select: { id: true, year: true, make: true, model: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
  ]);
  const lowRatings = await prisma.review.count({ where: { rating: { lte: 2 } } });

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description="Ratings renters leave after a trip. Remove reviews that are abusive or fake." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total reviews" value={stats._count._all} />
        <StatCard label="Average rating" value={stats._avg.rating ? stats._avg.rating.toFixed(2) : "—"} />
        <StatCard tone={lowRatings ? "warn" : "light"} label="1–2 star reviews" value={lowRatings} />
      </div>

      <FilterBar
        search={q}
        placeholder="Search comment, reviewer, host or car…"
        selects={[
          {
            name: "rating",
            value: rating >= 1 && rating <= 5 ? String(rating) : "",
            options: [
              { value: "", label: "Any rating" },
              ...[5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${r} star${r === 1 ? "" : "s"}` })),
            ],
          },
        ]}
      />

      {reviews.length === 0 ? (
        <EmptyState>No reviews match these filters.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-base leading-none">
                    <span className="text-amber-400">{"★".repeat(review.rating)}</span>
                    <span className="text-slate-200">{"★".repeat(5 - review.rating)}</span>
                  </p>
                  <p className="mt-2 text-[13px] text-slate-500">
                    <TextLink href={`/dashboard/admin/users/${review.author.id}`}>{review.author.name}</TextLink> reviewed{" "}
                    <TextLink href={`/dashboard/admin/vehicles/${review.listing.id}`}>
                      {review.listing.year} {review.listing.make} {review.listing.model}
                    </TextLink>{" "}
                    (host <TextLink href={`/dashboard/admin/users/${review.target.id}`}>{review.target.name}</TextLink>) ·{" "}
                    {shortDate(review.createdAt)} ·{" "}
                    <TextLink href={`/dashboard/admin/bookings/${review.bookingId}`}>booking</TextLink>
                  </p>
                  {review.comment ? (
                    <p className="mt-3 whitespace-pre-line text-[13px] text-slate-800">{review.comment}</p>
                  ) : (
                    <p className="mt-3 text-[13px] italic text-slate-400">No comment</p>
                  )}
                </div>
                <AdminActionButton
                  endpoint={`/api/admin/reviews/${review.id}`}
                  method="DELETE"
                  label="Delete"
                  variant="outline"
                  confirm="Delete this review permanently? This can't be undone."
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} params={params} />
    </div>
  );
}
