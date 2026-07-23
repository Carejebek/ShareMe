'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get('city') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    router.push(`/?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSearch}
      className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border shadow-sm"
    >
      <input
        type="text"
        placeholder="City (e.g. Manchester)"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="flex-1 border rounded-md px-3 py-2"
      />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="border rounded-md px-3 py-2"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="border rounded-md px-3 py-2"
      />
      <button
        type="submit"
        className="bg-brand-600 text-white rounded-md px-6 py-2 font-medium hover:bg-brand-700"
      >
        Search
      </button>
    </form>
  );
}
