import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/admin/icons";

export function PageHeader({
  eyebrow,
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
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 truncate font-mono text-[11px] text-slate-500">{eyebrow}</p>}
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-[13px] text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <h2 className="text-sm font-semibold text-slate-900">{children}</h2>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "light",
  delta,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: "light" | "dark" | "brand" | "warn";
  // Percentage change against the previous period; positive is shown green.
  delta?: number | null;
  icon?: IconName;
}) {
  const accent = {
    light: "",
    dark: "",
    brand: "before:bg-[#ff5a1f]",
    warn: "before:bg-amber-500",
  }[tone];
  const body = (
    <div
      className={`relative h-full overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-0.5 ${accent} ${
        href ? "transition hover:border-slate-300 hover:shadow" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {icon && <Icon name={icon} className="h-4 w-4 text-slate-400" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
        {delta !== undefined && delta !== null && Number.isFinite(delta) && (
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-semibold tabular-nums ${
              delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            <Icon name={delta >= 0 ? "arrowUp" : "arrowDown"} className="h-3 w-3" />
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

type Tone = "green" | "red" | "amber" | "blue" | "indigo" | "violet" | "slate" | "sky" | "orange" | "dark" | "solidRed";

const TONES: Record<Tone, { badge: string; dot: string }> = {
  green: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  red: { badge: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500" },
  amber: { badge: "bg-amber-50 text-amber-800 ring-amber-600/25", dot: "bg-amber-500" },
  blue: { badge: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500" },
  indigo: { badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/20", dot: "bg-indigo-500" },
  violet: { badge: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  slate: { badge: "bg-slate-50 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" },
  sky: { badge: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  orange: { badge: "bg-orange-50 text-orange-700 ring-orange-600/20", dot: "bg-orange-500" },
  dark: { badge: "bg-slate-900 text-white ring-slate-900", dot: "bg-white" },
  solidRed: { badge: "bg-rose-600 text-white ring-rose-600", dot: "bg-white" },
};

const BADGE_TONES: Record<string, Tone> = {
  // approval
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  // bookings
  CONFIRMED: "blue",
  COMPLETED: "green",
  CANCELLED: "slate",
  // payments
  SUCCEEDED: "green",
  FAILED: "red",
  REFUNDED: "violet",
  // rides
  REQUESTED: "amber",
  ACCEPTED: "blue",
  EN_ROUTE: "indigo",
  IN_PROGRESS: "orange",
  // roles
  ADMIN: "dark",
  HOST: "orange",
  RENTER: "sky",
  DRIVER: "indigo",
  // listing visibility
  ACTIVE: "green",
  INACTIVE: "slate",
  LIVE: "green",
  // accounts
  SUSPENDED: "solidRed",
  VERIFIED: "green",
  UNVERIFIED: "slate",
  // claims
  OPEN: "amber",
  IN_REVIEW: "blue",
  RESOLVED: "green",
  DENIED: "slate",
  // payouts
  PAID_OUT: "green",
  AWAITING_PAYOUT: "orange",
  PARTIALLY_REFUNDED: "violet",
};

function sentenceCase(text: string) {
  const lower = text.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function Badge({ value, label }: { value: string; label?: string }) {
  const tone = TONES[BADGE_TONES[value] ?? "slate"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {sentenceCase(label ?? value)}
    </span>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {action && <div className="shrink-0 text-[13px]">{action}</div>}
        </div>
      )}
      {/* Tables inside a card run edge to edge instead of drawing a second box. */}
      <div className="px-5 py-4 [&_.admin-table]:-mx-5 [&_.admin-table]:-my-4 [&_.admin-table]:rounded-none [&_.admin-table]:border-0 [&_.admin-table]:shadow-none">
        {children}
      </div>
    </section>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "danger" | "neutral";
  title?: ReactNode;
  children?: ReactNode;
}) {
  const styles = {
    info: { box: "border-blue-200 bg-blue-50 text-blue-900", icon: "text-blue-500", name: "info" as const },
    warn: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: "text-amber-500", name: "alert" as const },
    danger: { box: "border-rose-200 bg-rose-50 text-rose-900", icon: "text-rose-500", name: "alert" as const },
    neutral: { box: "border-slate-200 bg-slate-50 text-slate-700", icon: "text-slate-400", name: "info" as const },
  }[tone];
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 text-[13px] ${styles.box}`}>
      <Icon name={styles.name} className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`} />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-[13px] text-slate-500">
      <Icon name="inbox" className="h-6 w-6 text-slate-300" />
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
  const control =
    "h-9 rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
  const filtered = Boolean(search) || selects.some((s) => s.value);
  return (
    <form className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="search" name="q" defaultValue={search} placeholder={placeholder} className={`${control} w-full pl-9`} />
      </div>
      {selects.map((select) => (
        <select key={select.name} name={select.name} defaultValue={select.value} className={control}>
          {select.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
      <button
        type="submit"
        className="h-9 rounded-md bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-700"
      >
        Apply
      </button>
      {filtered && (
        <Link href="?" className="h-9 rounded-md px-3 text-[13px] font-medium leading-9 text-slate-500 hover:text-slate-900">
          Clear
        </Link>
      )}
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
  const button = "h-8 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium leading-8 text-slate-700 shadow-sm hover:bg-slate-50";
  const disabled = "h-8 cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 text-[13px] font-medium leading-8 text-slate-300";

  return (
    <div className="mt-3 flex items-center justify-between text-[13px] text-slate-500">
      <span>
        Showing <span className="font-medium text-slate-700 tabular-nums">{first}</span>–
        <span className="font-medium text-slate-700 tabular-nums">{last}</span> of{" "}
        <span className="font-medium text-slate-700 tabular-nums">{total}</span>
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <span className="hidden tabular-nums sm:inline">
            Page {page} of {pages}
          </span>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={button}>
              Previous
            </Link>
          ) : (
            <span className={disabled}>Previous</span>
          )}
          {page < pages ? (
            <Link href={hrefFor(page + 1)} className={button}>
              Next
            </Link>
          ) : (
            <span className={disabled}>Next</span>
          )}
        </div>
      )}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="admin-table overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead className="border-b border-slate-200 bg-slate-50/80">
          <tr>
            {head.map((h, i) => (
              <th key={`${h}-${i}`} className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 [&>tr:hover]:bg-slate-50/70">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-slate-700 ${className}`}>{children}</td>;
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 text-[13px] last:border-0">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-slate-900">{children}</span>
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-slate-900 underline-offset-2 hover:text-blue-700 hover:underline">
      {children}
    </Link>
  );
}

// Horizontal bar with one coloured segment per value (e.g. bookings by status).
export function SegmentBar({ segments }: { segments: { label: string; value: number; className: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        {total > 0 &&
          segments.map((s) =>
            s.value > 0 ? <div key={s.label} className={s.className} style={{ width: `${(s.value / total) * 100}%` }} /> : null
          )}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className={`h-2 w-2 rounded-sm ${s.className}`} />
              {s.label}
            </span>
            <span className="font-medium tabular-nums text-slate-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
