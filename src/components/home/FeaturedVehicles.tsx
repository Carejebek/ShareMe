import VehicleCard from "@/components/cards/VehicleCard";
import { prisma } from "@/lib/prisma";
import { PUBLIC_LISTING_WHERE } from "@/lib/listingVisibility";
import { toVehicleCard } from "@/lib/vehicleCards";

export default async function FeaturedVehicles() {
  const listings = await prisma.listing.findMany({
    where: PUBLIC_LISTING_WHERE,
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
    include: {
      reviews: {
        select: {
          rating: true,
        },
      },
    },
  });

  const vehicles = listings.map(toVehicleCard);

  return (
    <section id="featured-cars" className="bg-white py-24">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-[#e62e1f]">
              Featured vehicles
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight text-neutral-950 md:text-5xl">
              Find your perfect drive
            </h2>

            <p className="mt-4 max-w-2xl text-lg text-neutral-600">
              Explore premium vehicles from trusted JayXZ hosts near you.
            </p>
          </div>

          <a
            href="/cars"
            className="font-black text-[#e62e1f] transition hover:text-[#ff5a1f]"
          >
            View all vehicles →
          </a>
        </div>

        {vehicles.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-16 text-center">
            <h3 className="text-2xl font-black text-neutral-950">
              No vehicles have been listed yet
            </h3>

            <p className="mt-3 text-neutral-600">
              Become the first JayXZ host and add your vehicle.
            </p>

            <a
              href="/listings/new"
              className="mt-7 inline-block rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-8 py-4 font-bold text-white"
            >
              List your car
            </a>
          </div>
        ) : (
          <div className="mt-12 grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} {...vehicle} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
