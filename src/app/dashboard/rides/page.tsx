'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { formatDistance, formatMoney, formatWhen, STATUS_LABEL, STATUS_STYLE } from '@/lib/format';

interface MyRide {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: string | null;
  distanceMeters: number;
  durationMinutes: number;
  totalPrice: number;
  currency: string;
  status: string;
  paid: boolean;
  driver: { name: string; phone: string | null } | null;
}

function MyRides() {
  const search = useSearchParams();
  const [rides, setRides] = useState<MyRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/rides');
    if (res.status === 401) {
      setSignedOut(true);
    } else if (res.ok) {
      setRides(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20_000); // pick up driver updates
    return () => clearInterval(timer);
  }, [load]);

  async function cancel(id: string) {
    if (!confirm('Cancel this ride?')) return;
    setError('');
    const res = await fetch(`/api/rides/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' })
    });
    if (!res.ok) setError((await res.json()).error || 'Could not cancel.');
    load();
  }

  if (loading) return <p className="text-neutral-500">Loading…</p>;
  if (signedOut) {
    return (
      <p className="text-neutral-600">
        Please <Link href="/login?callbackUrl=/dashboard/rides" className="font-bold text-[#e62e1f]">log in</Link> to see your rides.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {search.get('booked') && (
        <p className="rounded-xl bg-green-50 px-4 py-3 font-semibold text-green-800">
          Ride booked! We are finding you a driver. This page updates automatically.
        </p>
      )}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-red-700">{error}</p>}

      {rides.length === 0 ? (
        <p className="text-neutral-600">
          You have no rides yet. <Link href="/ride" className="font-bold text-[#e62e1f]">Book your first ride</Link>.
        </p>
      ) : (
        rides.map((r) => (
          <div key={r.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-500">{formatWhen(r.scheduledAt)}</p>
                <p className="mt-1 font-bold text-neutral-950">{r.pickupAddress}</p>
                <p className="text-neutral-500">↓</p>
                <p className="font-bold text-neutral-950">{r.dropoffAddress}</p>
                <p className="mt-2 text-sm text-neutral-500">
                  ~{r.durationMinutes} min · {formatDistance(r.distanceMeters)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">{formatMoney(r.totalPrice, r.currency)}</p>
                <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[r.status] || ''}`}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
                {r.status === 'COMPLETED' && (
                  <p className="mt-1 text-xs text-neutral-500">{r.paid ? 'Paid' : 'Payment due to driver'}</p>
                )}
              </div>
            </div>

            {r.driver && r.status !== 'CANCELLED' && (
              <p className="mt-3 border-t pt-3 text-sm text-neutral-700">
                Driver: <span className="font-bold">{r.driver.name}</span>
                {r.driver.phone && (
                  <>
                    {' · '}
                    <a href={`tel:${r.driver.phone}`} className="font-bold text-[#e62e1f]">{r.driver.phone}</a>
                  </>
                )}
              </p>
            )}

            {(r.status === 'REQUESTED' || r.status === 'ACCEPTED') && (
              <button
                onClick={() => cancel(r.id)}
                className="mt-3 rounded-lg bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700"
              >
                Cancel ride
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default function MyRidesPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between">
          <h1 className="text-3xl font-black text-neutral-950">My rides</h1>
          <Link href="/ride" className="rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-5 py-3 font-black text-white">
            Book a ride
          </Link>
        </div>
        <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
          <MyRides />
        </Suspense>
      </section>
    </main>
  );
}
