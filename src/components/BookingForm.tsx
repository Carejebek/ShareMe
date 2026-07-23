'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export default function BookingForm({
  listingId,
  pricePerDay
}: {
  listingId: string;
  pricePerDay: number;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const days =
    startDate && endDate ? Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(startDate))) : 0;
  const total = days * pricePerDay;

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();

    if (!session?.user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, startDate, endDate })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Could not create booking.');
      return;
    }

    router.push(`/book/${data.id}`);
  }

  return (
    <form onSubmit={handleBook} className="bg-white border rounded-xl p-5 space-y-3">
      <h3 className="font-semibold text-lg">${pricePerDay}/day</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start date</label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End date</label>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
      </div>
      {days > 0 && (
        <p className="text-sm text-gray-600">
          {days} day{days > 1 ? 's' : ''} × ${pricePerDay} ={' '}
          <span className="font-semibold">${total.toFixed(2)}</span>
        </p>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-600 text-white rounded-md py-2 font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? 'Booking...' : 'Reserve'}
      </button>
    </form>
  );
}
