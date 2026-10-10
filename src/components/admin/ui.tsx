import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow = "JayXZ Administration",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff5a1f]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black text-neutral-950 md:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-neutral-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "light",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: "light" | "dark" | "brand" | "warn";
}) {
  const tones = {
    light: "bg-white text-neutral-950 shadow-sm",
    dark: "bg-neutral-950 text-white",
    brand: "bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] text-white",
    warn: "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
  };
  const body = (
    <div className={`h-full rounded-3xl p-6 ${tones[tone]} ${href ? "transition hover:-translate-y-0.5" : ""}`}>
      <p className={`text-sm ${tone === "light" ? "text-neutral-500" : "opacity-80"}`}>{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      {hint && <p className={`mt-2 text-xs ${tone === "light" ? "text-neutral-500" : "opacity-80"}`}>{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const BADGE_STYLES: Record<string, string> = {
  // approval
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  // bookings
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-neutral-200 text-neutral-700",
  // payments
  SUCCEEDED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-purple-100 text-purple-800",
  // rides
  REQUESTED: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  EN_ROUTE: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
  // roles
  ADMIN: "bg-neutral-950 text-white",
  HOST: "bg-orange-100 text-[#e62e1f]",
  RENTER: "bg-sky-100 text-sky-800",
  DRIVER: "bg-indigo-100 text-indigo-800",
  // listing visibility
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-neutral-200 text-neutral-700",
  LIVE: "bg-green-100 text-green-800",
  // accounts
  SUSPENDED: "bg-red-600 text-white",
  VERIFIED: "bg-green-100 text-green-800",
  UNVERIFIED: "bg-neutral-100 text-neutral-500",
  // claims
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_REVIEW: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  DENIED: "bg-neutral-200 text-neutral-700",
  // payouts
  PAID_OUT: "bg-green-100 text-green-800",
  AWAITING_PAYOUT: "bg-orange-100 text-orange-800",
  PARTIALLY_REFUNDED: "bg-purple-100 text-purple-800",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide ${
        BADGE_STYLES[value] ?? "bg-neutral-100 text-neutral-700"
      }`}
    >
      {label ?? value.replace(/_/g, " ")}
    </span>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl bg-white p-6 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-lg font-black text-neutral-950">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center text-neutral-500">
      {children}
    </div>
  );
}

// Plain GET form: filters live in the URL, so they work without JavaScript and can be bookmarked.
export function FilterBar({
  search,
  placeholder = "Search…",
  selects = [],
}: {
  search?: string;
  placeholder?: string;
  selects?: { name: string; value: string; options: { value: string; label: string }[] }[];
}) {
  return (
    <form className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm md:flex-row md:items-center">
      <input
        type="search"
        name="q"
        defaultValue={search}
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#ff5a1f]"
      />
      {selects.map((select) => (
        <select
          key={select.name}
          name={select.name}
          defaultValue={select.value}
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#ff5a1f]"
        >
          {select.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
      <button
        type="submit"
        className="rounded-xl bg-neutral-950 px-6 py-3 text-sm font-black text-white transition hover:bg-[#ff5a1f]"
      >
        Filter
      </button>
    </form>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  params: Record<string, string | string[] | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v && key !== "page") query.set(key, v);
    }
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `?${qs}` : "?";
  };
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="mt-5 flex items-center justify-between text-sm text-neutral-500">
      <span>
        {first}–{last} of {total}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className="rounded-lg bg-white px-4 py-2 font-bold shadow-sm hover:text-[#ff5a1f]">
            ← Prev
          </Link>
        )}
        {page < pages && (
          <Link href={hrefFor(page + 1)} className="rounded-lg bg-white px-4 py-2 font-bold shadow-sm hover:text-[#ff5a1f]">
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-neutral-100 text-xs uppercase tracking-wider text-neutral-500">
          <tr>
            {head.map((h, i) => (
              <th key={`${h}-${i}`} className="px-5 py-4 font-black">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-5 py-4 align-middle ${className}`}>{children}</td>;
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-100 py-3 text-sm last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-semibold text-neutral-950">{children}</span>
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-bold text-neutral-950 hover:text-[#ff5a1f]">
      {children}
    </Link>
  );
}
