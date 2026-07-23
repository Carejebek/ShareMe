import SearchBar from '@/components/SearchBar';
import ListingCard from '@/components/ListingCard';
import { ListingSummary } from '@/types';

async function getListings(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/listings?${params.toString()}`, {
    cache: 'no-store'
  });

  if (!res.ok) return [];
  return res.json() as Promise<ListingSummary[]>;
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const listings = await getListings(searchParams);

  return (
    <div className="space-y-6">
      <section className="text-center py-6">
        <h1 className="text-3xl font-bold">Find your next ride</h1>
        <p className="text-gray-500 mt-1">Rent unique cars from trusted local hosts.</p>
      </section>

      <SearchBar />

      {listings.length === 0 ? (
        <p className="text-center text-gray-500 py-12">
          No cars found. Try a different city or date range.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
