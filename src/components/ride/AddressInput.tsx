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
  // Shows a "Use my current location" button (used for the pickup address).
  allowCurrentLocation?: boolean;
}

function newSession(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AddressInput({ label, placeholder, value, onChange, allowCurrentLocation }: Props) {
  const [text, setText] = useState(value?.address ?? '');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [locating, setLocating] = useState(false);
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
      setLoading(true);
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
        setActive(-1);
        setOpen(true);
      } catch {
        if (ticket === latest.current) setError('Address search failed.');
      } finally {
        if (ticket === latest.current) setLoading(false);
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

  function locateMe() {
    if (!navigator.geolocation) {
      setError('Your browser cannot share your location. Please type your address.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`/api/maps/reverse?lat=${coords.latitude}&lng=${coords.longitude}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Could not find your address.');
          latest.current++; // ignore any typed search still in flight
          setText(data.address);
          setItems([]);
          setOpen(false);
          onChange({ placeId: data.placeId, address: data.address });
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was blocked. Allow it in your browser settings, or type your address.'
            : 'Could not get your location. Please type your address.'
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
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
          onKeyDown={(e) => {
            // Arrow keys move through suggestions, Enter picks one, Escape closes the list.
            if (!open || items.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => (i + 1) % items.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
            } else if (e.key === 'Enter' && active >= 0) {
              e.preventDefault();
              pick(items[active]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-autocomplete="list"
          className={`w-full rounded-xl border px-4 py-3 pr-10 text-neutral-900 outline-none focus:border-[#ff5a1f] ${
            value ? 'border-green-500 bg-green-50' : 'border-neutral-300 bg-white'
          }`}
        />
        {value ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600" aria-hidden="true">
            ✓
          </span>
        ) : (
          loading && (
            <span
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-neutral-300 border-t-[#ff5a1f]"
              aria-hidden="true"
            />
          )
        )}
      </div>

      {open && items.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-neutral-200 bg-white shadow-xl">
          {items.map((s, i) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => pick(s)}
                onMouseEnter={() => setActive(i)}
                className={`block w-full px-4 py-3 text-left ${i === active ? 'bg-orange-50' : 'hover:bg-orange-50'}`}
              >
                <span className="block font-semibold text-neutral-900">{s.main}</span>
                {s.secondary && <span className="block text-sm text-neutral-500">{s.secondary}</span>}
              </button>
            </li>
          ))}
          {/* Google requires this attribution when showing Places results without a Google map. */}
          <li className="border-t border-neutral-100 px-4 py-2 text-right text-[11px] text-neutral-400">powered by Google</li>
        </ul>
      )}
      {allowCurrentLocation && (
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-[#e62e1f] hover:underline disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
          {locating ? 'Finding you…' : 'Use my current location'}
        </button>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
