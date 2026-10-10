import { redirect } from "next/navigation";
import ReportIssueForm from "@/components/claims/ReportIssueForm";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL } from "@/lib/claims";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/rides";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_REVIEW: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  DENIED: "bg-neutral-200 text-neutral-700",
};

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function MyClaimsPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/claims");
  const { booking: defaultBookingId } = await searchParams;

  // Trips this user rented or hosted that can have an issue reported.
  const [bookings, claims] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        OR: [{ renterId: user.id }, { listing: { hostId: user.id } }],
      },
      select: { id: true, startDate: true, endDate: true, renterId: true, listing: { select: { year: true, make: true, model: true } } },
      orderBy: { startDate: "desc" },
      take: 100,
    }),
    prisma.claim.findMany({
      where: { reporterId: user.id },
      include: { booking: { select: { listing: { select: { year: true, make: true, model: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const options = bookings.map((b) => ({
    id: b.id,
    label: `${b.listing.year} ${b.listing.make} ${b.listing.model} · ${fmtDate(b.startDate)} → ${fmtDate(b.endDate)} (${
      b.renterId === user.id ? "you rented" : "you hosted"
    })`,
  }));

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#ff5a1f]">Trip issues</p>
          <h1 className="mt-2 text-4xl font-black text-neutral-950">Claims</h1>
          <p className="mt-2 text-neutral-600">Report damage, cleaning, late returns or other problems with a trip.</p>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="mb-5 text-xl font-black">Report an issue</h2>
          {options.length === 0 ? (
            <p className="text-sm text-neutral-500">You can report an issue once you have a confirmed or completed trip.</p>
          ) : (
            <ReportIssueForm bookings={options} defaultBookingId={defaultBookingId} />
          )}
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="mb-5 text-xl font-black">Your claims</h2>
          {claims.length === 0 ? (
            <p className="text-sm text-neutral-500">You haven&apos;t reported any issues.</p>
          ) : (
            <ul className="space-y-4">
              {claims.map((claim) => (
                <li key={claim.id} className="rounded-2xl bg-neutral-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black">
                      {CLAIM_TYPE_LABEL[claim.type]} · {claim.booking.listing.year} {claim.booking.listing.make} {claim.booking.listing.model}
                    </p>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_STYLE[claim.status]}`}>
                      {CLAIM_STATUS_LABEL[claim.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">Filed {fmtDate(claim.createdAt)}</p>
                  <p className="mt-3 whitespace-pre-line text-sm text-neutral-700">{claim.description}</p>
                  {claim.resolution && (claim.status === "RESOLVED" || claim.status === "DENIED") && (
                    <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm">
                      <strong>JayXZ decision:</strong> {claim.resolution}
                      {claim.amountApproved && <> · Approved amount: ${Number(claim.amountApproved).toFixed(2)}</>}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
