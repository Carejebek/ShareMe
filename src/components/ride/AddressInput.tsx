'use client';

import { useEffect, useRef, useState } from 'react';

export interface PickedAddress {
  placeId: string;
  address: string;
}

interface Suggestion {
  placeId: string;
  description: string;
  main: string;
  secondary: string;
}

interface Props {
  label: string;
  placeholder: string;
  value: PickedAddress | null;
  onChange: (value: PickedAddress | null) => void;
}

function newSession(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AddressInput({ label, placeholder, value, onChange }: Props) {
  const [text, setText] = useState(value?.address ?? '');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const session = useRef(newSession());
  const box = useRef<HTMLDivElement>(null);
  const latest = useRef(0);

  // Debounced address search
  useEffect(() => {
    if (value || text.trim().length < 3) {
      latest.current++; // discard any search still in flight
      setItems([]);
      return;
    }
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/maps/autocomplete?q=${encodeURIComponent(text.trim())}&s=${session.current}`
        );
        const data = await res.json();
        if (ticket !== latest.current) return; // a newer search replaced this one
        if (!res.ok) {
          setError(data.error || 'Address search failed.');
          setItems([]);
          return;
        }
        setError('');
        setItems(data.suggestions || []);
        setOpen(true);
      } catch {
        if (ticket === latest.current) setError('Address search failed.');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [text, value]);

  // Close the list when clicking elsewhere
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function pick(s: Suggestion) {
    setText(s.description);
    setItems([]);
    setOpen(false);
    session.current = newSession();
    onChange({ placeId: s.placeId, address: s.description });
  }

  return (
    <div ref={box} className="relative">
      <label className="mb-1 block text-sm font-bold text-neutral-800">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            if (value) onChange(null); // typing again clears the chosen address
          }}
          onFocus={() => items.length > 0 && setOpen(true)}
          className={`w-full rounded-xl border px-4 py-3 pr-10 text-neutral-900 outline-none focus:border-[#ff5a1f] ${
            value ? 'border-green-500 bg-green-50' : 'border-neutral-300 bg-white'
          }`}
        />
        {value && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600" aria-hidden="true">
            ✓
          </span>
        )}
      </div>

      {open && items.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-neutral-200 bg-white shadow-xl">
          {items.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="block w-full px-4 py-3 text-left hover:bg-orange-50"
              >
                <span className="block font-semibold text-neutral-900">{s.main}</span>
                {s.secondary && <span className="block text-sm text-neutral-500">{s.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
