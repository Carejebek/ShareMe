'use client';

import { useEffect, useState } from 'react';
import { INSTALL_EVENT, isStandalone } from '@/lib/install';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type JxWindow = Window & { __jxInstall?: BeforeInstallPromptEvent | null };

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

// Only Chrome-type browsers (Android, desktop) offer a real one-tap install (beforeinstallprompt).
// Apple does not let any website install itself, so on iPhone/iPad we show the steps instead.
type Platform =
  | 'ios-safari'
  | 'ios-chrome'
  | 'ios-other'
  | 'in-app' // Instagram, Facebook, TikTok... built-in browsers cannot install apps
  | 'android'
  | 'desktop';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|musical_ly|BytedanceWebview|TikTok|LinkedInApp|Twitter|Pinterest|GSA\//i.test(ua);
  if (inApp) return 'in-app';
  if (ios) {
    if (/CriOS/i.test(ua)) return 'ios-chrome';
    if (/FxiOS|EdgiOS|OPiOS|OPT\//i.test(ua)) return 'ios-other';
    return 'ios-safari';
  }
  return /android/i.test(ua) ? 'android' : 'desktop';
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-label="Share" className="mx-0.5 inline h-4 w-4 -translate-y-0.5 align-middle" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function steps(platform: Platform): React.ReactNode[] {
  const b = (text: string) => <span className="font-semibold text-neutral-900">{text}</span>;
  switch (platform) {
    case 'ios-safari':
      return [
        <>Tap {b('Share')} <ShareIcon /> at the bottom of the screen. On newer iPhones, tap {b('•••')} first, then {b('Share')}.</>,
        <>Scroll down and tap {b('Add to Home Screen')}.</>,
        <>Tap {b('Add')}. JayXZ appears on your home screen.</>
      ];
    case 'ios-chrome':
      return [
        <>Tap {b('Share')} <ShareIcon /> in the address bar at the top right.</>,
        <>Tap {b('Add to Home Screen')} (tap {b('More')} if you don&apos;t see it).</>,
        <>Tap {b('Add')}.</>
      ];
    case 'ios-other':
      return [
        <>Open the browser menu and tap {b('Share')} <ShareIcon />.</>,
        <>Tap {b('Add to Home Screen')}, then {b('Add')}.</>,
        <>Don&apos;t see it? Open jayxz.com in {b('Safari')} and install from there.</>
      ];
    case 'in-app':
      return [
        <>This app&apos;s built-in browser can&apos;t install apps.</>,
        <>Tap {b('•••')} and choose {b('Open in browser')} (or {b('Open in Safari')}), or copy the link below and paste it in your browser.</>,
        <>Then tap {b('Install the app')} again.</>
      ];
    case 'android':
      return [
        <>Tap the {b('⋮')} menu at the top right of Chrome.</>,
        <>Tap {b('Install app')} or {b('Add to Home screen')}.</>,
        <>Tap {b('Install')}. Already installed? Open JayXZ from your home screen.</>
      ];
    default:
      return [
        <>Click the install icon at the right end of the address bar, or open the browser menu.</>,
        <>Choose {b('Install JayXZ')} (in Edge: {b('Apps')} → {b('Install this site as an app')}).</>,
        <>Safari on Mac: {b('File')} → {b('Add to Dock')}.</>
      ];
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [visible, setVisible] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const w = window as JxWindow;
    const detected = detectPlatform();
    setPlatform(detected);

    const pickUp = () => {
      if (!w.__jxInstall) return;
      setDeferred(w.__jxInstall);
      setShowSteps(false);
      if (!wasDismissedRecently()) setVisible(true);
    };
    pickUp(); // the early script in <head> may already have caught it

    // iPhone/iPad and in-app browsers never offer a one-tap install, so show the steps right away.
    const iosLike = detected.startsWith('ios') || detected === 'in-app';
    if (iosLike && !wasDismissedRecently()) {
      setShowSteps(true);
      setVisible(true);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      w.__jxInstall = event as BeforeInstallPromptEvent;
      pickUp();
    };
    const onInstalled = () => {
      w.__jxInstall = null;
      setDeferred(null);
      setVisible(false);
    };
    // "Install the app" links (menu, footer) open the banner even after "Not now".
    const onRequest = () => {
      setShowSteps(!w.__jxInstall);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('jayxz:bip', pickUp);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener(INSTALL_EVENT, onRequest);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('jayxz:bip', pickUp);
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
    const w = window as JxWindow;
    // No one-tap install available: show the steps instead of doing nothing.
    if (!deferred) {
      setShowSteps(true);
      return;
    }
    setBusy(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'dismissed') rememberDismissal();
      setVisible(false);
    } catch {
      // The browser's offer was already used or expired.
      setShowSteps(true);
    } finally {
      // Each offer can only be used once.
      w.__jxInstall = null;
      setDeferred(null);
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      /* clipboard blocked: the steps still apply */
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

          {showSteps ? (
            <ol className="mt-2 space-y-2 text-sm leading-6 text-neutral-600">
              {steps(platform).map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5a1f] text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-sm leading-6 text-neutral-600">Add JayXZ to your home screen for faster access.</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {!showSteps && (
              <button
                type="button"
                onClick={install}
                disabled={busy}
                className="rounded-lg bg-[#ff5a1f] px-4 py-2 text-sm font-bold text-white hover:bg-[#e64a19] disabled:opacity-60"
              >
                {busy ? 'Opening…' : 'Install'}
              </button>
            )}
            {showSteps && platform === 'in-app' && (
              <button type="button" onClick={copyLink} className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-bold text-white">
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            )}
            {showSteps && (
              <button type="button" onClick={() => setVisible(false)} className="rounded-lg bg-[#ff5a1f] px-4 py-2 text-sm font-bold text-white">
                Got it
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
