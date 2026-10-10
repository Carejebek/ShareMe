"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Method = "PATCH" | "POST" | "DELETE";

async function send(endpoint: string, method: Method, body?: unknown) {
  const response = await fetch(endpoint, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

const VARIANTS = {
  dark: "bg-neutral-950 text-white hover:bg-[#ff5a1f]",
  green: "bg-green-600 text-white hover:bg-green-700",
  red: "bg-red-600 text-white hover:bg-red-700",
  outline: "border border-neutral-300 bg-white text-neutral-900 hover:border-[#ff5a1f] hover:text-[#ff5a1f]",
};

// A button that calls an admin API and refreshes the page on success.
export function AdminActionButton({
  endpoint,
  method = "PATCH",
  body,
  label,
  busyLabel,
  confirm,
  variant = "dark",
  disabled,
  redirectTo,
  promptFor,
}: {
  endpoint: string;
  method?: Method;
  body?: Record<string, unknown>;
  label: string;
  busyLabel?: string;
  confirm?: string;
  variant?: keyof typeof VARIANTS;
  disabled?: boolean;
  redirectTo?: string;
  // Asks the admin for text (e.g. a rejection reason) and sends it as body[field].
  promptFor?: { field: string; message: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    let payload = body;
    if (promptFor) {
      const answer = window.prompt(promptFor.message);
      if (answer === null) return;
      if (!answer.trim()) {
        setError("A reason is required.");
        return;
      }
      payload = { ...body, [promptFor.field]: answer.trim() };
    } else if (confirm && !window.confirm(confirm)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await send(endpoint, method, payload);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={run}
        disabled={busy || disabled}
        className={`rounded-xl px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]}`}
      >
        {busy ? busyLabel ?? "Working…" : label}
      </button>
      {error && <span className="mt-1 max-w-[220px] text-xs font-bold text-red-600">{error}</span>}
    </span>
  );
}

// A dropdown that sends { [field]: value } to an admin API when changed.
export function AdminSelectAction({
  endpoint,
  method = "PATCH",
  field,
  extraBody,
  value,
  options,
  placeholder,
  confirm,
}: {
  endpoint: string;
  method?: Method;
  field: string;
  extraBody?: Record<string, unknown>;
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  confirm?: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(next: string) {
    if (!next || next === current) return;
    if (confirm && !window.confirm(confirm.replace("{value}", options.find((o) => o.value === next)?.label ?? next))) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await send(endpoint, method, { ...extraBody, [field]: next });
      setCurrent(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col">
      <select
        value={current}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#ff5a1f] disabled:opacity-50"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 max-w-[220px] text-xs font-bold text-red-600">{error}</span>}
    </span>
  );
}
