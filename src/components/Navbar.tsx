"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

const dashboardByRole: Record<string, { label: string; href: string }> = {
  ADMIN: { label: "Admin", href: "/dashboard/admin" },
  HOST: { label: "Dashboard", href: "/dashboard/host" },
  DRIVER: { label: "Dispatch", href: "/dashboard/dispatch" },
  RENTER: { label: "My Bookings", href: "/dashboard/bookings" },
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  const user = session?.user as { name?: string | null; email?: string | null; role?: string } | undefined;
  const dashboard = user?.role ? dashboardByRole[user.role] : undefined;

  const navigation = [
    { label: "Book a Ride", href: "/ride" },
    { label: "Browse Cars", href: "/" },
    { label: "Become a Host", href: "/register" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Help", href: "#support" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-xl">
      <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 lg:px-10">
        <Link
          href="/"
          className="text-3xl font-black tracking-tight text-white"
        >
          Jay<span className="text-[#ff4b1f]">XZ</span>
        </Link>

        <div className="hidden items-center gap-9 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-semibold text-white transition hover:text-[#ff5a1f]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-5 lg:flex">
          {status === "loading" ? null : user ? (
            <>
              <Link
                href="/account"
                title="Your account"
                className="text-sm text-neutral-300 transition hover:text-[#ff5a1f]"
              >
                {user.name || user.email}
              </Link>

              {dashboard && (
                <Link
                  href={dashboard.href}
                  className="font-semibold text-white transition hover:text-[#ff5a1f]"
                >
                  {dashboard.label}
                </Link>
              )}

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-xl border border-white/30 px-6 py-3 font-bold text-white transition hover:border-[#ff5a1f] hover:text-[#ff5a1f]"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-semibold text-white transition hover:text-[#ff5a1f]"
              >
                Log in
              </Link>

              <Link
                href="/register"
                className="rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-3 font-bold text-white shadow-lg shadow-red-950/30 transition hover:scale-105"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-white/30 px-3 py-2 text-white lg:hidden"
          aria-label="Toggle navigation"
        >
          ☰
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-black/95 px-6 py-6 lg:hidden">
          <div className="flex flex-col gap-5">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-semibold text-white"
              >
                {item.label}
              </Link>
            ))}

            {status === "loading" ? null : user ? (
              <>
                {dashboard && (
                  <Link
                    href={dashboard.href}
                    onClick={() => setOpen(false)}
                    className="font-semibold text-white"
                  >
                    {dashboard.label}
                  </Link>
                )}

                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="font-semibold text-white"
                >
                  Account
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="rounded-xl border border-white/30 px-5 py-3 text-center font-bold text-white"
                >
                  Log out ({user.name || user.email})
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="font-semibold text-white"
                >
                  Log in
                </Link>

                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-5 py-3 text-center font-bold text-white"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
