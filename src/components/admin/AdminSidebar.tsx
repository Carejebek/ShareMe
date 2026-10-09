"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; href: string; count?: number };

export default function AdminSidebar({ items }: { items: Item[] }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
            isActive(item.href)
              ? "bg-neutral-950 text-white"
              : "text-neutral-700 hover:bg-white hover:text-[#ff5a1f]"
          }`}
        >
          {item.label}
          {item.count ? (
            <span className="rounded-full bg-[#ff5a1f] px-2 py-0.5 text-[11px] font-black text-white">
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
