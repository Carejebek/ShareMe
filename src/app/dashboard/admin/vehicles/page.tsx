import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ListingApprovalButtons from "@/components/admin/ListingApprovalButtons";

export default async function AdminVehiclesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const admin = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/");
  }

  const listings = await prisma.listing.findMany({
    include: {
      host: true,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  });

  const pending = listings.filter(
    (listing) => listing.approvalStatus === "PENDING"
  ).length;

  const approved = listings.filter(
    (listing) => listing.approvalStatus === "APPROVED"
  ).length;

  const rejected = listings.filter(
    (listing) => listing.approvalStatus === "REJECTED"
  ).length;

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="mx-auto max-w-7xl px-6 py-10">

        <Link
          href="/dashboard/admin"
          className="font-bold text-neutral-600 hover:text-[#ff5a1f]"
        >
          ← Platform Overview
        </Link>

        <div className="mt-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#ff5a1f]">
            JayXZ Administration
          </p>

          <h1 className="mt-3 text-4xl font-black text-neutral-950 md:text-5xl">
            Vehicle Approvals
          </h1>

          <p className="mt-3 text-neutral-600">
            Review vehicles before they become publicly available on JayXZ.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl bg-neutral-950 p-6 text-white">
            <p className="text-sm text-neutral-400">Total</p>
            <p className="mt-2 text-4xl font-black">{listings.length}</p>
          </div>

          <div className="rounded-3xl bg-orange-50 p-6">
            <p className="text-sm text-orange-700">Pending</p>
            <p className="mt-2 text-4xl font-black text-orange-700">
              {pending}
            </p>
          </div>

          <div className="rounded-3xl bg-green-50 p-6">
            <p className="text-sm text-green-700">Approved</p>
            <p className="mt-2 text-4xl font-black text-green-700">
              {approved}
            </p>
          </div>

          <div className="rounded-3xl bg-red-50 p-6">
            <p className="text-sm text-red-700">Rejected</p>
            <p className="mt-2 text-4xl font-black text-red-700">
              {rejected}
            </p>
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-neutral-300 bg-white px-8 py-20 text-center">
            <h2 className="text-2xl font-black text-neutral-950">
              No vehicles awaiting review
            </h2>

            <p className="mt-3 text-neutral-500">
              Vehicles submitted by hosts will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="grid gap-6 rounded-3xl bg-white p-6 shadow-sm lg:grid-cols-[260px_1fr_auto] lg:items-center"
              >
                <div className="overflow-hidden rounded-2xl bg-neutral-200">
                  <img
                    src={
                      listing.imageUrls[0] ||
                      "/images/shareme-hero.jpg"
                    }
                    alt={`${listing.make} ${listing.model}`}
                    className="h-44 w-full object-cover"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-black text-neutral-950">
                      {listing.make} {listing.model}
                    </h2>

                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">
                      {listing.approvalStatus}
                    </span>
                  </div>

                  <p className="mt-2 text-neutral-500">
                    {listing.year} · {listing.city}, {listing.state}
                  </p>

                  <p className="mt-2 text-sm text-neutral-500">
                    Host: <strong>{listing.host.name}</strong>
                  </p>

                  <p className="mt-3 text-xl font-black text-neutral-950">
                    ${Number(listing.pricePerDay).toFixed(0)} / day
                  </p>

                  <Link
                    href={`/listings/${listing.id}`}
                    className="mt-4 inline-block text-sm font-black text-[#e62e1f]"
                  >
                    Inspect vehicle →
                  </Link>
                </div>

                <ListingApprovalButtons
                  listingId={listing.id}
                  currentStatus={listing.approvalStatus}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
