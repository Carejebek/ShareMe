'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  formatDistance,
  formatMoney,
  formatWhen,
  mapsDirectionsUrl,
  STATUS_LABEL,
  STATUS_STYLE
} from '@/lib/format';

interface Driver {
  id: string;
  name: string;
  phone: string | null;
}

interface DispatchRide {
  id: string;
  pickupAddress: string;
  pickupPlaceId: string;
  dropoffAddress: string;
  dropoffPlaceId: string;
  scheduledAt: string | null;
  riderPhone: string | null;
  notes: string | null;
  distanceMeters: number;
  durationMinutes: number;
  totalPrice: number;
  currency: string;
  status: string;
  paid: boolean;
  driverId: string | null;
  rider: { name: string };
  driver: Driver | null;
}

const NEXT_LABEL: Record<string, string> = {
  ACCEPTED: 'I am on my way',
  EN_ROUTE: 'Start trip',
  IN_PROGRESS: 'Complete trip'
};

export default function DispatchPage() {
  const [role, setRole] = useState('');
  const [userId, setUserId] = useState('');
  const [rides, setRides] = useState<DispatchRide[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState('');
  const [error, setError] = useState('');
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/dispatch/rides');
    if (res.status === 401) setDenied('Please log in as a driver or admin.');
    else if (res.status === 403) setDenied('This page is for drivers and admins only.');
    else if (res.ok) {
      const data = await res.json();
      setRole(data.role);
      setUserId(data.userId);
      setRides(data.rides);
      setDrivers(data.drivers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  async function act(id: string, body: Record<string, unknown>) {
    setError('');
    const res = await fetch(`/api/rides/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) setError((await res.json()).error || 'Action failed.');
    load();
  }

  if (loading) return <Shell><p className="text-neutral-500">Loading…</p></Shell>;
  if (denied) {
    return (
      <Shell>
        <p className="text-neutral-600">
          {denied} <Link href="/login?callbackUrl=/dashboard/dispatch" className="font-bold text-[#e62e1f]">Log in</Link>
        </p>
      </Shell>
    );
  }

  const isAdmin = role === 'ADMIN';
  const finished = (s: string) => s === 'COMPLETED' || s === 'CANCELLED';
  const visible = rides.filter((r) => (showDone ? true : !finished(r.status) || (r.status === 'COMPLETED' && !r.paid)));

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-neutral-600">{isAdmin ? 'All rides' : 'Open rides and your trips'} · refreshes automatically</p>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Show finished
        </label>
      </div>
      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-red-700">{error}</p>}
      {isAdmin && drivers.length === 0 && (
        <p className="mb-4 rounded-xl bg-yellow-50 px-4 py-3 text-yellow-800">
          No drivers yet. Promote a user to the DRIVER role to assign rides.
        </p>
      )}

      <div className="space-y-4">
        {visible.length === 0 && <p className="text-neutral-500">Nothing to show right now.</p>}
        {visible.map((r) => {
          const mine = r.driverId === userId;
          return (
            <div key={r.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-500">
                    {formatWhen(r.scheduledAt)} · Rider: {r.rider.name}
                  </p>
                  <p className="mt-1 font-bold">{r.pickupAddress}</p>
                  <p className="text-neutral-500">↓</p>
                  <p className="font-bold">{r.dropoffAddress}</p>
                  <p className="mt-2 text-sm text-neutral-500">
                    ~{r.durationMinutes} min · {formatDistance(r.distanceMeters)}
                  </p>
                  {r.notes && <p className="mt-1 text-sm italic text-neutral-600">“{r.notes}”</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">{formatMoney(r.totalPrice, r.currency)}</p>
                  <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[r.status] || ''}`}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                  {r.status === 'COMPLETED' && <p className="mt-1 text-xs text-neutral-500">{r.paid ? 'Paid' : 'Unpaid'}</p>}
                </div>
              </div>

              <p className="mt-3 text-sm text-neutral-700">
                Driver: <span className="font-bold">{r.driver ? r.driver.name : 'Unassigned'}</span>
                {r.riderPhone && (
                  <>
                    {' · Rider phone: '}
                    <a href={`tel:${r.riderPhone}`} className="font-bold text-[#e62e1f]">{r.riderPhone}</a>
                  </>
                )}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                {(mine || isAdmin) && !finished(r.status) && (
                  <a
                    href={mapsDirectionsUrl(r)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700"
                  >
                    Open in Google Maps
                  </a>
                )}

                {r.status === 'REQUESTED' && !r.driverId && (
                  <button onClick={() => act(r.id, { action: 'accept' })} className="rounded-lg bg-[#e62e1f] px-4 py-2 text-sm font-black text-white">
                    Accept ride
                  </button>
                )}

                {isAdmin && (r.status === 'REQUESTED' || r.status === 'ACCEPTED') && drivers.length > 0 && (
                  <>
                    <select
                      value={pick[r.id] ?? r.driverId ?? ''}
                      onChange={(e) => setPick((p) => ({ ...p, [r.id]: e.target.value }))}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    >
                      <option value="">Choose driver…</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <button
                      disabled={!(pick[r.id] ?? r.driverId)}
                      onClick={() => act(r.id, { action: 'assign', driverId: pick[r.id] ?? r.driverId })}
                      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                    >
                      Assign
                    </button>
                  </>
                )}

                {(mine || isAdmin) && NEXT_LABEL[r.status] && (
                  <button onClick={() => act(r.id, { action: 'advance' })} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-black text-white">
                    {NEXT_LABEL[r.status]}
                  </button>
                )}

                {(mine || isAdmin) && r.status === 'COMPLETED' && !r.paid && (
                  <button onClick={() => act(r.id, { action: 'markPaid' })} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-black text-white">
                    Mark as paid
                  </button>
                )}

                {isAdmin && !finished(r.status) && (
                  <button
                    onClick={() => confirm('Cancel this ride?') && act(r.id, { action: 'cancel' })}
                    className="ml-auto rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-6 text-3xl font-black text-neutral-950">Dispatch</h1>
        {children}
      </section>
    </main>
  );
}
