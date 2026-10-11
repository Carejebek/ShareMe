"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/admin/icons";

export type NavItem = { label: string; href: string; icon: IconName; count?: number; urgent?: boolean };
export type NavSection = { title?: string; items: NavItem[] };

const ROOT = "/dashboard/admin";

function isActive(pathname: string, href: string) {
  return href === ROOT ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Breadcrumbs are derived from the URL: section labels come from the nav, record ids become "Details".
function useBreadcrumbs(pathname: string, sections: NavSection[]) {
  const items = sections.flatMap((s) => s.items);
  const crumbs: { label: string; href?: string }[] = [{ label: "Admin", href: ROOT }];
  const section = items.filter((i) => i.href !== ROOT).find((i) => isActive(pathname, i.href));
  if (section) {
    const isDetail = pathname !== section.href;
    crumbs.push({ label: section.label, href: isDetail ? section.href : undefined });
    if (isDetail) crumbs.push({ label: "Details" });
  } else if (pathname.startsWith(`${ROOT}/search`)) {
    crumbs.push({ label: "Search" });
  } else {
    crumbs.push({ label: "Overview" });
  }
  return crumbs;
}

function Sidebar({ sections, pathname, onNavigate }: { sections: NavSection[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((section, index) => (
        <div key={section.title ?? index}>
          {section.title && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{section.title}</p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                      active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#ff6a33]" : "text-slate-500 group-hover:text-slate-300"}`}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.count ? (
                      <span
                        className={`min-w-[20px] rounded px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
                          item.urgent ? "bg-[#ff5a1f] text-white" : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {item.count > 99 ? "99+" : item.count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href={ROOT} className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#ff5a1f] text-xs font-bold text-white">J</span>
      <span className="text-sm font-semibold tracking-tight text-white">
        JayXZ <span className="font-normal text-slate-400">Admin</span>
      </span>
    </Link>
  );
}

function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 text-left transition hover:bg-slate-100"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white">
          {initials(name) || "A"}
        </span>
        <span className="hidden text-[13px] font-medium text-slate-700 md:block">{name}</span>
        <Icon name="chevronDown" className="hidden h-3.5 w-3.5 text-slate-400 md:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-[13px] font-medium text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
            <span className="mt-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Administrator
            </span>
          </div>
          <Link href="/account" className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50">
            <Icon name="settings" className="h-4 w-4 text-slate-400" /> Account &amp; password
          </Link>
          <Link href="/" className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50">
            <Icon name="external" className="h-4 w-4 text-slate-400" /> View marketplace
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2.5 border-t border-slate-100 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
          >
            <Icon name="logout" className="h-4 w-4 text-slate-400" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses search from anywhere, like most admin consoles.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || target.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = inputRef.current?.value.trim();
    if (q) router.push(`${ROOT}/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={submit} className="relative w-full max-w-md">
      <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        placeholder="Search users, vehicles, bookings…"
        className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-8 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-400 sm:block">
        /
      </kbd>
    </form>
  );
}

export default function AdminShell({
  sections,
  admin,
  children,
}: {
  sections: NavSection[];
  admin: { name: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const crumbs = useBreadcrumbs(pathname, sections);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-slate-950 lg:flex">
        <Brand />
        <Sidebar sections={sections} pathname={pathname} />
        <div className="border-t border-white/10 px-5 py-3 text-[11px] text-slate-500">Production · jayxz.com</div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-950 shadow-xl">
            <Brand />
            <Sidebar sections={sections} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <ol className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <Icon name="chevronRight" className="h-3.5 w-3.5 text-slate-300" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-slate-500 hover:text-slate-900">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-900">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
          <div className="flex flex-1 justify-end gap-3 md:justify-center">
            <GlobalSearch />
          </div>
          <UserMenu name={admin.name} email={admin.email} />
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
