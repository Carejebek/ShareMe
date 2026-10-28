"use client";

import { FormEvent, useState } from "react";
import { WAITLIST_INTERESTS } from "@/lib/waitlist";

export default function WaitlistForm() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Couldn't add you to the waitlist.");
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-green-50 px-6 py-8 text-center text-green-800">
        <p className="text-xl font-black">You&apos;re on the list!</p>
        <p className="mt-2">We&apos;ll be in touch as soon as JayXZ is ready for you.</p>
      </div>
    );
  }

  const input = "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100";
  const label = "mb-1.5 block text-sm font-bold text-neutral-800";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={label}>Full name</span>
          <input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Jane Doe" className={input} />
        </label>
        <label>
          <span className={label}>Email</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" placeholder="jane@example.com" className={input} />
        </label>
        <label>
          <span className={label}>
            Mobile number <span className="font-normal text-neutral-500">(optional)</span>
          </span>
          <input name="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="+1 555 123 4567" className={input} />
        </label>
        <label>
          <span className={label}>
            City <span className="font-normal text-neutral-500">(optional)</span>
          </span>
          <input name="city" maxLength={100} autoComplete="address-level2" placeholder="Your city" className={input} />
        </label>
      </div>

      <fieldset>
        <legend className={label}>I&apos;m most interested in</legend>
        <div className="grid gap-3 sm:grid-cols-4">
          {WAITLIST_INTERESTS.map((option, index) => (
            <label key={option.value} className="cursor-pointer">
              <input type="radio" name="interest" value={option.value} defaultChecked={index === 0} className="peer sr-only" />
              <span className="block rounded-xl border border-neutral-300 px-4 py-3 text-center text-sm font-bold text-neutral-700 peer-checked:border-[#ff5a1f] peer-checked:bg-orange-50 peer-checked:text-[#e64a19] peer-focus-visible:ring-4 peer-focus-visible:ring-orange-100">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Hidden from people; catches bots that fill in every field. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-[#ff5a1f] px-6 py-4 font-black text-white transition hover:bg-[#e64a19] disabled:opacity-60"
      >
        {busy ? "Joining…" : "Join the waitlist"}
      </button>
      <p className="text-center text-xs text-neutral-500">We&apos;ll only use your details to tell you about JayXZ. No spam.</p>
    </form>
  );
}
