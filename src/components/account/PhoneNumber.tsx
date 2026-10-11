"use client";

import { FormEvent, useState } from "react";

export default function PhoneNumber({ initial }: { initial: string | null }) {
  const [phone, setPhone] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/phone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Couldn't save your number.");
      setPhone(result.phone ?? "");
      setMessage({ ok: true, text: result.phone ? "Saved. You'll get trip updates by text." : "Number removed." });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+1 555 123 4567"
        autoComplete="tel"
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-[#ff5a1f]"
      />
      <button type="submit" disabled={busy} className="rounded-xl bg-neutral-950 px-6 py-3 font-black text-white transition hover:bg-[#ff5a1f] disabled:opacity-50">
        {busy ? "Saving…" : "Save number"}
      </button>
      {message && <p className={`text-sm font-bold ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
    </form>
  );
}
