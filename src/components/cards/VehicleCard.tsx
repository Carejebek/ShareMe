import Link from "next/link";

type VehicleCardProps = {
  id: string;
  name: string;
  year: number;
  city: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
};

export default function VehicleCard({
  id,
  name,
  year,
  city,
  price,
  rating,
  reviews,
  image,
}: VehicleCardProps) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-2 hover:shadow-2xl">
      <Link href={`/listings/${id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />

          <button
            type="button"
            aria-label="Save vehicle"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-xl text-white backdrop-blur-md transition hover:bg-[#e62e1f]"
          >
            ♡
          </button>

          <span className="absolute bottom-4 left-4 rounded-full bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-4 py-2 text-xs font-black uppercase tracking-wider text-white">
            Instant Book
          </span>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-neutral-950">
                {name}
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                {year} · {city}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xl font-black text-neutral-950">
                ${price}
              </p>
              <p className="text-sm text-neutral-500">per day</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#ff5a1f]">★</span>
              <span className="font-bold text-neutral-950">{rating}</span>
              <span className="text-neutral-500">({reviews} reviews)</span>
            </div>

            <span className="font-bold text-[#e62e1f]">
              View car →
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
