'use client';

import { useEffect, useState } from 'react';
import { navigationUrl, type NavApp } from '@/lib/format';

const PREF_KEY = 'bedere-nav-pref';
const LABELS: Record<NavApp, string> = {
  google: 'Google Maps',
  waze: 'Waze',
  apple: 'Apple Maps'
};

export default function NavigateSheet({
  title,
  address,
  placeId,
  onClose
}: {
  title: string;
  address: string;
  placeId?: string;
  onClose: () => void;
}) {
  const [isApple, setIsApple] = useState(false);
  const [pref, setPref] = useState<NavApp | null>(null);

  useEffect(() => {
    setIsApple(/iphone|ipad|ipod|macintosh/i.test(navigator.userAgent));
    try {
      const saved = localStorage.getItem(PREF_KEY);
      if (saved === 'google' || saved === 'waze' || saved === 'apple') setPref(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const apps: NavApp[] = isApple ? ['google', 'waze', 'apple'] : ['google', 'waze'];
  if (pref && apps.includes(pref)) apps.sort((a, b) => (a === pref ? -1 : b === pref ? 1 : 0));

  function choose(app: NavApp) {
    try {
      localStorage.setItem(PREF_KEY, app);
    } catch {
      /* ignore */
    }
    window.open(navigationUrl(app, { address, placeId }), '_blank', 'noopener');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{title}</p>
        <p className="mt-1 text-sm font-semibold text-neutral-900">{address}</p>
        <p className="mt-3 text-xs text-neutral-500">Choose your navigation app</p>
        <div className="mt-2 space-y-2">
          {apps.map((app) => (
            <button
              key={app}
              type="button"
              onClick={() => choose(app)}
              className="flex w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-bold text-neutral-900 hover:bg-neutral-50"
            >
              {LABELS[app]}
              {app === pref && <span className="text-xs font-semibold text-green-700">Your usual</span>}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold text-neutral-600">
          Not now
        </button>
      </div>
    </div>
  );
}
