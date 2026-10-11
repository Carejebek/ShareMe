import Link from "next/link";

type VehicleCardProps = {
  id: string;
  name: string;
  year: number;
  city: string;
  price: number;
  rating: number | null; // null when the car has no reviews yet
  reviews: number;
  image: string;
  badge?: string | null;
};

export default function VehicleCard({ id, name, year, city, price, rating, reviews, image, badge }: VehicleCardProps) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-2 hover:shadow-2xl">
      <Link href={`/listings/${id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />

          {badge && (
            <span className="absolute bottom-4 left-4 rounded-full bg-black/60 px-4 py-2 text-xs font-black uppercase tracking-wider text-white backdrop-blur-md">
              {badge}
            </span>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-neutral-950">{name}</h3>
              <p className="mt-1 text-sm text-neutral-500">
                {year} · {city}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xl font-black text-neutral-950">${price % 1 === 0 ? price : price.toFixed(2)}</p>
              <p className="text-sm text-neutral-500">per day</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
            {rating === null ? (
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#e62e1f]">New</span>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#ff5a1f]">★</span>
                <span className="font-bold text-neutral-950">{rating.toFixed(1)}</span>
                <span className="text-neutral-500">
                  ({reviews} review{reviews === 1 ? "" : "s"})
                </span>
              </div>
            )}

            <span className="font-bold text-[#e62e1f]">View car →</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
