import type { VehicleCategory } from "@prisma/client";

// Vehicle types hosts choose from. No server imports here: client components use this too.
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
