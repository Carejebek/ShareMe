'use client';

import { useEffect, useState } from 'react';
import { INSTALL_EVENT, isStandalone } from '@/lib/install';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'jayxz-install-dismissed';
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? Date.now() - Number(raw) < DISMISS_MS : false;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

// Only Android/desktop Chrome-type browsers offer a real install button (beforeinstallprompt).
// Everywhere else we can only tell people where the browser keeps "Add to Home Screen",
// and that place depends on the browser.
type Platform =
  | 'ios-safari' // Share button in the toolbar
  | 'ios-chrome' // Share button in the address bar, top right
  | 'ios-other' // Firefox, Edge, etc.: Share is inside the browser menu
  | 'in-app' // Instagram, Facebook, TikTok...: no Add to Home Screen at all
  | 'other'; // Android/desktop browser that hasn't offered an install button

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPads report themselves as a Mac; touch support gives them away.
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|musical_ly|BytedanceWebview|TikTok|LinkedInApp|Twitter|Pinterest|GSA\//i.test(ua);
  if (inApp) return 'in-app';
  if (!ios) return 'other';
  if (/CriOS/i.test(ua)) return 'ios-chrome';
  if (/FxiOS|EdgiOS|OPiOS|OPT\//i.test(ua)) return 'ios-other';
  return 'ios-safari';
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-label="Share" className="mx-0.5 inline h-4 w-4 -translate-y-0.5 align-middle" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function Instructions({ platform }: { platform: Platform }) {
  const b = (text: string) => <span className="font-semibold text-neutral-900">{text}</span>;
  switch (platform) {
    case 'ios-safari':
      return <>Tap {b('Share')} <ShareIcon /> in the toolbar, then {b('Add to Home Screen')}.</>;
    case 'ios-chrome':
      return <>Tap {b('Share')} <ShareIcon /> in the address bar at the top right, then {b('Add to Home Screen')}.</>;
    case 'ios-other':
      return <>Open the browser menu, tap {b('Share')} <ShareIcon />, then {b('Add to Home Screen')}. If it isn&apos;t there, open jayxz.com in Safari.</>;
    case 'in-app':
      return <>This app&apos;s built-in browser can&apos;t install apps. Tap {b('•••')} and choose {b('Open in browser')} (or {b('Open in Safari')}), then install from there.</>;
    default:
      return <>Open your browser menu and choose {b('Install app')} or {b('Add to Home screen')}.</>;
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>('other');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const detected = detectPlatform();
    setPlatform(detected);
    // iOS and in-app browsers never fire beforeinstallprompt, so show the instructions straight away.
    if (detected !== 'other' && !wasDismissedRecently()) setVisible(true);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      if (!wasDismissedRecently()) setVisible(true);
    };
    const onInstalled = () => {
      setDeferred(null);
      setVisible(false);
    };
    // "Install the app" links (menu, footer) reopen the banner even after "Not now".
    const onRequest = () => setVisible(true);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener(INSTALL_EVENT, onRequest);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener(INSTALL_EVENT, onRequest);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    rememberDismissal();
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'dismissed') rememberDismissal();
    setVisible(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      /* clipboard blocked: the instructions still apply */
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Install JayXZ"
      className="fixed inset-x-4 z-[60] mx-auto max-w-sm rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-neutral-950">Install the JayXZ app</p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            {deferred ? 'Add JayXZ to your home screen for faster access.' : <Instructions platform={platform} />}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {deferred && (
              <button
                type="button"
                onClick={install}
                className="rounded-lg bg-[#ff5a1f] px-4 py-2 text-sm font-bold text-white hover:bg-[#e64a19]"
              >
                Install
              </button>
            )}
            {!deferred && platform === 'in-app' && (
              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-bold text-white"
              >
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
