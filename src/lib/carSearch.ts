import type { Prisma, VehicleCategory } from "@prisma/client";
import { PUBLIC_LISTING_WHERE } from "@/lib/listingVisibility";

export const CATEGORIES: { value: VehicleCategory; label: string; icon: string }[] = [
  { value: "ECONOMY", label: "Economy", icon: "🚗" },
  { value: "SEDAN", label: "Sedan", icon: "🚘" },
  { value: "SUV", label: "SUV", icon: "🚙" },
  { value: "LUXURY", label: "Luxury", icon: "◆" },
  { value: "SPORTS", label: "Sports", icon: "🏎️" },
  { value: "VAN", label: "Van", icon: "🚐" },
  { value: "TRUCK", label: "Truck", icon: "🛻" },
];
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])) as Record<VehicleCategory, string>;

export const FUEL_TYPES = ["GASOLINE", "HYBRID", "ELECTRIC", "DIESEL"] as const;

export const SORTS = {
  newest: { label: "Newest", orderBy: { createdAt: "desc" } },
  price_asc: { label: "Price: low to high", orderBy: { pricePerDay: "asc" } },
  price_desc: { label: "Price: high to low", orderBy: { pricePerDay: "desc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.ListingOrderByWithRelationInput }>;

type Params = Record<string, string | string[] | undefined>;

function get(params: Params, key: string): string {
  const v = params[key];
  return ((Array.isArray(v) ? v[0] : v) ?? "").trim().slice(0, 100);
}

// A yyyy-mm-dd date from the URL, or null if it's missing or invalid.
function day(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type CarFilters = {
  where: string;
  from: string;
  until: string;
  category: VehicleCategory | "";
  make: string;
  fuel: (typeof FUEL_TYPES)[number] | "";
  seats: number | null;
  maxPrice: number | null;
  sort: keyof typeof SORTS;
  dateError: string;
};

// Reads the marketplace filters from the URL (used by the homepage search, quick filters and /cars).
export function parseCarFilters(params: Params): CarFilters {
  const category = get(params, "category").toUpperCase();
  const fuel = get(params, "fuel").toUpperCase();
  const seats = Number.parseInt(get(params, "seats"), 10);
  const maxPrice = Number.parseFloat(get(params, "maxPrice"));
  const sort = get(params, "sort");
  const from = get(params, "from");
  const until = get(params, "until");

  let dateError = "";
  const start = day(from);
  const end = day(until);
  if ((from && !start) || (until && !end)) dateError = "Those dates aren't valid.";
  else if (start && end && end <= start) dateError = "The return date must be after the pick-up date.";

  return {
    where: get(params, "where"),
    from: start ? from : "",
    until: end ? until : "",
    category: CATEGORIES.some((c) => c.value === category) ? (category as VehicleCategory) : "",
    make: get(params, "make"),
    fuel: (FUEL_TYPES as readonly string[]).includes(fuel) ? (fuel as CarFilters["fuel"]) : "",
    seats: Number.isFinite(seats) && seats > 0 && seats <= 15 ? seats : null,
    maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : null,
    sort: sort in SORTS ? (sort as keyof typeof SORTS) : "newest",
    dateError,
  };
}

export function carSearchWhere(f: CarFilters): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [PUBLIC_LISTING_WHERE];

  if (f.where) {
    // "Austin, TX" matches the city; also try the state and the listing title.
    const [city, state] = f.where.split(",").map((s) => s.trim());
    and.push({
      OR: [
        { city: { contains: city, mode: "insensitive" } },
        { state: { equals: city, mode: "insensitive" } },
        { title: { contains: f.where, mode: "insensitive" } },
      ],
      ...(state ? { state: { contains: state, mode: "insensitive" } } : {}),
    });
  }
  if (f.category) and.push({ category: f.category });
  if (f.make) and.push({ make: { equals: f.make, mode: "insensitive" } });
  if (f.fuel) and.push({ fuelType: f.fuel });
  if (f.seats) and.push({ seats: { gte: f.seats } });
  if (f.maxPrice) and.push({ pricePerDay: { lte: f.maxPrice } });

  // Only cars with no pending or confirmed booking overlapping the requested days.
  if (f.from && f.until && !f.dateError) {
    const start = new Date(`${f.from}T00:00:00`);
    const end = new Date(`${f.until}T23:59:59`);
    and.push({
      bookings: {
        none: { status: { in: ["PENDING", "CONFIRMED"] }, startDate: { lt: end }, endDate: { gt: start } },
      },
    });
  }
  return { AND: and };
}

// Builds a /cars link keeping the current filters, with some changed.
export function carsHref(f: Partial<Record<string, string | number | null>>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(f)) {
    if (value !== null && value !== undefined && value !== "" && !(key === "sort" && value === "newest")) query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `/cars?${qs}` : "/cars";
}
