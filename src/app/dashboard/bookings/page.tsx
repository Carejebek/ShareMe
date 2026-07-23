'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BookingWithListing {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  listing: { id: string; title: string; city: string; state: string };
  review: { id: string } | null;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  async function load() {
    const res = await fetch('/api/bookings');
    if (res.ok) {
      setBookings(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function cancelBooking(id: string) {
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' })
    });
    load();
  }

  async function submitReview(bookingId: string) {
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, rating, comment })
    });
    setReviewFor(null);
    setComment('');
    setRating(5);
    load();
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My bookings</h1>
      {bookings.length === 0 ? (
        <p className="text-gray-500">
          You have no bookings yet. <Link href="/" className="text-brand-600">Browse cars</Link>.
        </p>
      ) : (
        bookings.map((b) => (
          <div key={b.id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <Link href={`/listings/${b.listing.id}`} className="font-semibold hover:underline">
                  {b.listing.title}
                </Link>
                <p className="text-sm text-gray-500">
                  {new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()} ·{' '}
                  {b.listing.city}, {b.listing.state}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${b.totalPrice.toFixed(2)}</p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    b.status === 'CONFIRMED'
                      ? 'bg-green-100 text-green-700'
                      : b.status === 'CANCELLED'
                      ? 'bg-red-100 text-red-700'
                      : b.status === 'COMPLETED'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {b.status}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-3">
              {b.status === 'PENDING' && (
                <>
                  <Link
                    href={`/book/${b.id}`}
                    className="text-sm bg-brand-600 text-white rounded-md px-3 py-1.5"
                  >
                    Pay now
                  </Link>
                  <button
                    onClick={() => cancelBooking(b.id)}
                    className="text-sm bg-gray-100 rounded-md px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </>
              )}
              {b.status === 'COMPLETED' && !b.review && (
                <button
                  onClick={() => setReviewFor(b.id)}
                  className="text-sm bg-gray-100 rounded-md px-3 py-1.5"
                >
                  Leave a review
                </button>
              )}
            </div>

            {reviewFor === b.id && (
              <div className="mt-3 border-t pt-3 space-y-2">
                <select
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value, 10))}
                  className="border rounded-md px-3 py-2"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="How was your trip?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  rows={2}
                />
                <button
                  onClick={() => submitReview(b.id)}
                  className="text-sm bg-brand-600 text-white rounded-md px-3 py-1.5"
                >
                  Submit review
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
