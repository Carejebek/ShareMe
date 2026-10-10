"use client";

import { FormEvent, useState } from "react";

export default function ChangePassword() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("newPassword") !== data.get("confirmPassword")) {
      setMessage({ ok: false, text: "The new passwords don't match." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Couldn't change your password.");
      form.reset();
      setMessage({ ok: true, text: "Password changed." });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-[#ff5a1f]";
  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <input type="password" name="currentPassword" placeholder="Current password" autoComplete="current-password" required className={input} />
      <input type="password" name="newPassword" placeholder="New password (at least 8 characters)" autoComplete="new-password" minLength={8} required className={input} />
      <input type="password" name="confirmPassword" placeholder="Confirm new password" autoComplete="new-password" minLength={8} required className={input} />
      <button type="submit" disabled={busy} className="rounded-xl bg-neutral-950 px-6 py-3 font-black text-white transition hover:bg-[#ff5a1f] disabled:opacity-50">
        {busy ? "Saving…" : "Change password"}
      </button>
      {message && <p className={`text-sm font-bold ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
    </form>
  );
}
