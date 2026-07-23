'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListingSummary } from '@/types';

export default function MyListingsPage() {
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/listings?mine=true');
    if (res.ok) {
      setListings(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function removeListing(id: string) {
    await fetch(`/api/listings/${id}`, { method: 'DELETE' });
    load();
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My listings</h1>
        <Link href="/listings/new" className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm">
          + Add listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="text-gray-500">You haven&apos;t listed any cars yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <Link href={`/listings/${listing.id}`} className="font-semibold hover:underline">
                  {listing.title}
                </Link>
                <span className="font-medium text-brand-700">${listing.pricePerDay}/day</span>
              </div>
              <p className="text-sm text-gray-500">
                {listing.year} {listing.make} {listing.model} · {listing.city}, {listing.state}
              </p>
              <button
                onClick={() => removeListing(listing.id)}
                className="text-sm text-red-600 mt-2"
              >
                Deactivate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
