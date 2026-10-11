"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const columns = [
  {
    title: "Rent",
    links: [
      { label: "Browse cars", href: "/cars" },
      { label: "Electric cars", href: "/cars?fuel=ELECTRIC" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    title: "Ride",
    links: [
      { label: "Book a ride", href: "/ride" },
      { label: "My rides", href: "/dashboard/rides" },
      { label: "Drive with JayXZ", href: "/drive" },
    ],
  },
  {
    title: "Host",
    links: [
      { label: "Become a host", href: "/register" },
      { label: "List your car", href: "/listings/new" },
    ],
  },
  {
    title: "JayXZ",
    links: [
      { label: "Support", href: "/support" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function SiteFooter() {
  const pathname = usePathname();
  // The admin portal has its own layout.
  if (pathname?.startsWith("/dashboard/admin")) return null;

  return (
    <footer id="support" className="bg-black py-14 text-gray-400">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div>
          <Link href="/" className="text-3xl font-extrabold text-white">
            Jay<span className="text-[#ff5a1f]">XZ</span>
          </Link>
          <p className="mt-2">Drive Smart. Travel Better.</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-bold uppercase tracking-wider text-white">{column.title}</p>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-12 max-w-7xl px-6 text-sm text-gray-600">© {new Date().getFullYear()} JayXZ. All rights reserved.</p>
    </footer>
  );
}
