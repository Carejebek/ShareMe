import type { ReactNode } from "react";
import AdminShell, { type NavSection } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { UNPAID_EARNINGS_WHERE, UNPAID_RIDES_WHERE } from "@/lib/payouts";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  const [pendingVehicles, pendingBookings, failedPayments, openRides, pendingVerifications, openClaims, unpaidBookings, failedSms, pendingDrivers, unpaidRides] =
    await Promise.all([
      prisma.listing.count({ where: { approvalStatus: "PENDING" } }),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "FAILED" } }),
      prisma.ride.count({ where: { status: "REQUESTED", driverId: null } }),
      prisma.user.count({ where: { verificationStatus: "PENDING" } }),
      prisma.claim.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
      prisma.booking.count({ where: UNPAID_EARNINGS_WHERE }),
      prisma.smsMessage.count({
        where: { status: { in: ["failed", "undelivered"] }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.driverProfile.count({ where: { status: "PENDING" } }),
      prisma.ride.count({ where: UNPAID_RIDES_WHERE }),
    ]);

  const sections: NavSection[] = [
    { items: [{ label: "Overview", href: "/dashboard/admin", icon: "overview" }] },
    {
      title: "Marketplace",
      items: [
        { label: "Vehicles", href: "/dashboard/admin/vehicles", icon: "car", count: pendingVehicles, urgent: true },
        { label: "Bookings", href: "/dashboard/admin/bookings", icon: "calendar", count: pendingBookings },
        { label: "Rides", href: "/dashboard/admin/rides", icon: "route", count: openRides, urgent: true },
        { label: "Reviews", href: "/dashboard/admin/reviews", icon: "star" },
      ],
    },
    {
      title: "Trust & safety",
      items: [
        { label: "Verifications", href: "/dashboard/admin/verifications", icon: "shield", count: pendingVerifications, urgent: true },
        { label: "Drivers", href: "/dashboard/admin/drivers", icon: "route", count: pendingDrivers, urgent: true },
        { label: "Claims", href: "/dashboard/admin/claims", icon: "alert", count: openClaims, urgent: true },
        { label: "Users", href: "/dashboard/admin/users", icon: "users" },
        { label: "Waitlist", href: "/dashboard/admin/waitlist", icon: "inbox" },
      ],
    },
    {
      title: "Finance",
      items: [
        { label: "Payments", href: "/dashboard/admin/payments", icon: "card", count: failedPayments, urgent: true },
        { label: "Payouts", href: "/dashboard/admin/payouts", icon: "wallet", count: unpaidBookings + unpaidRides },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Integrations", href: "/dashboard/admin/integrations", icon: "plug" },
        { label: "SMS log", href: "/dashboard/admin/sms", icon: "message", count: failedSms, urgent: true },
        { label: "Audit log", href: "/dashboard/admin/audit", icon: "log" },
        { label: "Settings", href: "/dashboard/admin/settings", icon: "settings" },
      ],
    },
  ];

  return (
    <AdminShell sections={sections} admin={{ name: admin.name, email: admin.email }}>
      {children}
    </AdminShell>
  );
}
