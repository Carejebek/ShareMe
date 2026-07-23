import Link from 'next/link';
import { ListingSummary } from '@/types';

export default function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block rounded-xl border bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
        {listing.imageUrls?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.imageUrls[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          'No photo yet'
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold truncate">{listing.title}</h3>
        <p className="text-sm text-gray-500">
          {listing.year} {listing.make} {listing.model}
        </p>
        <p className="text-sm text-gray-500">
          {listing.city}, {listing.state} · {listing.seats} seats
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-brand-700">${listing.pricePerDay}/day</span>
          {listing.avgRating ? (
            <span className="text-sm text-yellow-600">★ {listing.avgRating.toFixed(1)}</span>
          ) : (
            <span className="text-xs text-gray-400">No reviews yet</span>
          )}
        </div>
      </div>
    </Link>
  );
}
