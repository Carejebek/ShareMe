'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewListingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    pricePerDay: 50,
    city: '',
    state: '',
    seats: 4,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, imageUrls: [] })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error?.formErrors?.[0] || 'Could not create listing. Are you signed in?');
      return;
    }

    router.push(`/listings/${data.id}`);
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-xl border">
      <h1 className="text-2xl font-bold mb-6">List your car</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          placeholder="Title"
          required
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className="w-full border rounded-md px-3 py-2"
        />
        <textarea
          placeholder="Description"
          required
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Make (e.g. Toyota)"
            required
            value={form.make}
            onChange={(e) => update('make', e.target.value)}
            className="border rounded-md px-3 py-2"
          />
          <input
            placeholder="Model (e.g. Camry)"
            required
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            className="border rounded-md px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="number"
            placeholder="Year"
            required
            value={form.year}
            onChange={(e) => update('year', parseInt(e.target.value, 10))}
            className="border rounded-md px-3 py-2"
          />
          <input
            type="number"
            placeholder="Price/day"
            required
            value={form.pricePerDay}
            onChange={(e) => update('pricePerDay', parseFloat(e.target.value))}
            className="border rounded-md px-3 py-2"
          />
          <input
            type="number"
            placeholder="Seats"
            required
            value={form.seats}
            onChange={(e) => update('seats', parseInt(e.target.value, 10))}
            className="border rounded-md px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="City"
            required
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            className="border rounded-md px-3 py-2"
          />
          <input
            placeholder="State"
            required
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            className="border rounded-md px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.transmission}
            onChange={(e) => update('transmission', e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="AUTOMATIC">Automatic</option>
            <option value="MANUAL">Manual</option>
          </select>
          <select
            value={form.fuelType}
            onChange={(e) => update('fuelType', e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="GASOLINE">Gasoline</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ELECTRIC">Electric</option>
            <option value="DIESEL">Diesel</option>
          </select>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white rounded-md py-2 font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Publishing...' : 'Publish listing'}
        </button>
      </form>
    </div>
  );
}
