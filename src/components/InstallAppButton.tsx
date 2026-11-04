'use client';

import { useEffect, useState } from 'react';
import { isStandalone, openInstallPrompt } from '@/lib/install';

// "Install the app" link for menus and the footer. Hidden once the app is installed and opened from the home screen.
export default function InstallAppButton({ className, onClick }: { className?: string; onClick?: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!isStandalone()), []);
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        openInstallPrompt();
      }}
      className={className}
    >
      Install the app
    </button>
  );
}
