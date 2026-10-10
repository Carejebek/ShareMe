import type { ReactNode } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { UNPAID_EARNINGS_WHERE } from "@/lib/payouts";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  const [pendingVehicles, pendingBookings, failedPayments, openRides, pendingVerifications, openClaims, unpaidBookings] =
    await Promise.all([
      prisma.listing.count({ where: { approvalStatus: "PENDING" } }),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "FAILED" } }),
      prisma.ride.count({ where: { status: "REQUESTED", driverId: null } }),
      prisma.user.count({ where: { verificationStatus: "PENDING" } }),
      prisma.claim.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
      prisma.booking.count({ where: UNPAID_EARNINGS_WHERE }),
    ]);

  const items = [
    { label: "Overview", href: "/dashboard/admin" },
    { label: "Vehicles", href: "/dashboard/admin/vehicles", count: pendingVehicles },
    { label: "Verifications", href: "/dashboard/admin/verifications", count: pendingVerifications },
    { label: "Bookings", href: "/dashboard/admin/bookings", count: pendingBookings },
    { label: "Claims", href: "/dashboard/admin/claims", count: openClaims },
    { label: "Users", href: "/dashboard/admin/users" },
    { label: "Payments", href: "/dashboard/admin/payments", count: failedPayments },
    { label: "Host payouts", href: "/dashboard/admin/payouts", count: unpaidBookings },
    { label: "Rides", href: "/dashboard/admin/rides", count: openRides },
    { label: "Reviews", href: "/dashboard/admin/reviews" },
    { label: "Audit log", href: "/dashboard/admin/audit" },
    { label: "Settings", href: "/dashboard/admin/settings" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-20">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-8 lg:grid-cols-[220px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-4 hidden px-4 text-xs font-black uppercase tracking-[0.3em] text-neutral-400 lg:block">
            Admin
          </p>
          <AdminSidebar items={items} />
          <p className="mt-6 hidden px-4 text-xs text-neutral-400 lg:block">
            Signed in as
            <br />
            <span className="font-bold text-neutral-600">{admin.email}</span>
          </p>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
