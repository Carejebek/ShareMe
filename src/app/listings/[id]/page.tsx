import { notFound } from 'next/navigation';
import BookingForm from '@/components/BookingForm';
import StarRating from '@/components/StarRating';

async function getListing(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/listings/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await getListing(params.id);
  if (!listing) notFound();

  const avgRating =
    listing.reviews.length > 0
      ? listing.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / listing.reviews.length
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <div className="h-72 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
          {listing.imageUrls?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.imageUrls[0]}
              alt={listing.title}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            'No photo yet'
          )}
        </div>

        <h1 className="text-2xl font-bold">{listing.title}</h1>
        <p className="text-gray-500">
          {listing.year} {listing.make} {listing.model} · {listing.city}, {listing.state}
        </p>
        <p className="text-gray-500 text-sm">
          {listing.seats} seats · {listing.transmission} · {listing.fuelType}
        </p>

        <p className="text-gray-700">{listing.description}</p>

        <div className="border-t pt-4">
          <h2 className="font-semibold mb-2">Hosted by {listing.host.name}</h2>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold mb-3">
            Reviews {avgRating && <StarRating rating={avgRating} />}
          </h2>
          {listing.reviews.length === 0 ? (
            <p className="text-gray-500 text-sm">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {listing.reviews.map((review: any) => (
                <div key={review.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{review.author.name}</span>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && <p className="text-sm text-gray-600 mt-1">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <BookingForm listingId={listing.id} pricePerDay={listing.pricePerDay} />
      </div>
    </div>
  );
}
