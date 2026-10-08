'use client';

import { useEffect, useState } from 'react';

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

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;
    if (isIos()) {
      setShowIos(true);
      setHidden(false);
    }
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => {
      setDeferred(null);
      setShowIos(false);
      setHidden(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden || (!deferred && !showIos)) return null;

  const dismiss = () => {
    rememberDismissal();
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'dismissed') rememberDismissal();
    setHidden(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Install JayXZ"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-sm font-bold text-white"
        >
          JX
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Install JayXZ</p>
          {deferred ? (
            <p className="mt-0.5 text-sm text-gray-600">
              Add JayXZ to your home screen for faster access.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-gray-600">
              Tap the <span className="font-semibold">Share</span> button, then{' '}
              <span className="font-semibold">Add to Home Screen</span>.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {deferred && (
              <button
                type="button"
                onClick={install}
                className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
