import type { Listing } from "@prisma/client";
import { CATEGORY_LABEL } from "@/lib/carSearch";

// Shapes a listing (with its review ratings) into the props VehicleCard expects.
export function toVehicleCard(listing: Listing & { reviews: { rating: number }[] }) {
  const reviews = listing.reviews.length;
  return {
    id: listing.id,
    name: `${listing.make} ${listing.model}`,
    year: listing.year,
    city: `${listing.city}, ${listing.state}`,
    price: Number(listing.pricePerDay),
    rating: reviews ? listing.reviews.reduce((sum, r) => sum + r.rating, 0) / reviews : null,
    reviews,
    image: listing.imageUrls[0] || "/images/shareme-hero.jpg",
    badge: listing.fuelType === "ELECTRIC" ? "Electric" : listing.category ? CATEGORY_LABEL[listing.category] : null,
  };
}
