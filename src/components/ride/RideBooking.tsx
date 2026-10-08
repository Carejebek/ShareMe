'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AddressInput, { PickedAddress } from './AddressInput';
import { formatDistance, formatMoney } from '@/lib/format';

interface Quote {
  distanceMeters: number;
  durationMinutes: number;
  fare: {
    minutes: number;
    ratePerMinute: number;
    minimumFare: number;
    subtotal: number;
    total: number;
    minimumApplied: boolean;
    currency: string;
  };
}

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time
function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function RideBooking() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [pickup, setPickup] = useState<PickedAddress | null>(null);
  const [dropoff, setDropoff] = useState<PickedAddress | null>(null);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [dateTime, setDateTime] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minDateTime = useMemo(() => localInputValue(new Date(Date.now() + 30 * 60_000)), []);

  const scheduledIso = useMemo(() => {
    if (when !== 'later' || !dateTime) return null;
    const d = new Date(dateTime);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }, [when, dateTime]);

  const readyForQuote = !!pickup && !!dropoff && (when === 'now' || !!scheduledIso);

  // Re-price whenever the addresses or time change
  useEffect(() => {
    setQuote(null);
    if (!readyForQuote) return;
    let cancelled = false;
    setQuoting(true);
    setError('');
    fetch('/api/rides/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickupPlaceId: pickup!.placeId,
        dropoffPlaceId: dropoff!.placeId,
        scheduledAt: scheduledIso
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(data.error || 'Could not calculate the price.');
        else setQuote(data);
      })
      .catch(() => !cancelled && setError('Could not calculate the price.'))
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
  }, [readyForQuote, pickup, dropoff, scheduledIso]);

  async function book() {
    if (!pickup || !dropoff || !quote) return;
    if (phone.replace(/\D/g, '').length < 7) {
      setError('Please enter a phone number the driver can reach.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupPlaceId: pickup.placeId,
          pickupAddress: pickup.address,
          dropoffPlaceId: dropoff.placeId,
          dropoffAddress: dropoff.address,
          scheduledAt: scheduledIso,
          phone,
          notes: notes || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not book the ride.');
        return;
      }
      router.push('/dashboard/rides?booked=1');
    } catch {
      setError('Could not book the ride. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const signedIn = status === 'authenticated' && !!session?.user;

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-3">
        <AddressInput label="Pickup address" placeholder="Where should we pick you up?" value={pickup} onChange={setPickup} />
        <AddressInput label="Drop-off address" placeholder="Where are you going?" value={dropoff} onChange={setDropoff} />

        <div>
          <span className="mb-1 block text-sm font-bold text-neutral-800">When</span>
          <div className="flex gap-3">
            {(['now', 'later'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setWhen(opt)}
                className={`flex-1 rounded-xl border px-4 py-3 font-bold ${
                  when === opt
                    ? 'border-[#ff5a1f] bg-orange-50 text-[#e62e1f]'
                    : 'border-neutral-300 bg-white text-neutral-700'
                }`}
              >
                {opt === 'now' ? 'As soon as possible' : 'Schedule for later'}
              </button>
            ))}
          </div>
          {when === 'later' && (
            <input
              type="datetime-local"
              value={dateTime}
              min={minDateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="mt-3 w-full rounded-xl border border-neutral-300 px-4 py-3"
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-neutral-800">Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="So your driver can reach you"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-neutral-800">Notes for the driver (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Gate code, number of bags, flight number…"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3"
          />
        </div>
      </div>

      <aside className="lg:col-span-2">
        <div className="sticky top-28 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-neutral-950">Your price</h2>

          {!readyForQuote && (
            <p className="mt-3 text-neutral-500">Enter pickup and drop-off addresses to see your price.</p>
          )}
          {quoting && <p className="mt-3 text-neutral-500">Calculating…</p>}

          {quote && (
            <div className="mt-3">
              <p className="text-5xl font-black text-neutral-950">
                {formatMoney(quote.fare.total, quote.fare.currency)}
              </p>
              <dl className="mt-4 space-y-1 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <dt>Drive time</dt>
                  <dd className="font-semibold">~{quote.durationMinutes} min</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Distance</dt>
                  <dd className="font-semibold">{formatDistance(quote.distanceMeters)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>
                    {quote.durationMinutes} min × {formatMoney(quote.fare.ratePerMinute, quote.fare.currency)}
                  </dt>
                  <dd className="font-semibold">{formatMoney(quote.fare.subtotal, quote.fare.currency)}</dd>
                </div>
                {quote.fare.minimumApplied && (
                  <div className="flex justify-between">
                    <dt>Minimum fare applied</dt>
                    <dd className="font-semibold">{formatMoney(quote.fare.minimumFare, quote.fare.currency)}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-3 text-xs text-neutral-500">
                This price is locked in when you book. It will not change if traffic does.
              </p>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {signedIn ? (
            <button
              type="button"
              onClick={book}
              disabled={!quote || submitting}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Booking…' : 'Book this ride'}
            </button>
          ) : (
            <Link
              href="/login?callbackUrl=/ride"
              className="mt-5 block w-full rounded-xl bg-neutral-900 px-6 py-4 text-center text-lg font-black text-white"
            >
              Log in to book
            </Link>
          )}
          <p className="mt-3 text-center text-xs text-neutral-500">
            You pay the driver at the end of the trip.
          </p>
        </div>
      </aside>
    </div>
  );
}
