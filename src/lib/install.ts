// Shared bits for the "install the app" banner (InstallPrompt) and the links that reopen it.

export const INSTALL_EVENT = 'jayxz:install';

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function openInstallPrompt() {
  window.dispatchEvent(new Event(INSTALL_EVENT));
}
