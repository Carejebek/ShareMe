"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export type AdminField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  placeholder?: string;
  required?: boolean;
  step?: string;
  min?: number;
  max?: number;
  hint?: string;
};

// A small form that sends its fields (plus extraBody) as JSON to an admin API, then refreshes the page.
// Number fields are sent as numbers (or null when left empty); checkboxes as booleans.
export default function AdminForm({
  endpoint,
  method = "PATCH",
  fields,
  extraBody,
  submitLabel,
  confirm,
  variant = "dark",
  successMessage,
  resetOnSuccess,
}: {
  endpoint: string;
  method?: "PATCH" | "POST";
  fields: AdminField[];
  extraBody?: Record<string, unknown>;
  submitLabel: string;
  confirm?: string;
  variant?: "dark" | "red" | "green";
  successMessage?: string;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body: Record<string, unknown> = { ...extraBody };
    for (const field of fields) {
      if (field.type === "checkbox") body[field.name] = data.get(field.name) === "on";
      else if (field.type === "number") {
        const raw = String(data.get(field.name) ?? "").trim();
        body[field.name] = raw === "" ? null : Number(raw);
      } else body[field.name] = String(data.get(field.name) ?? "");
    }

    if (confirm && !window.confirm(confirm.replace(/\{(\w+)\}/g, (_, key) => String(body[key] ?? "")))) return;

    setBusy(true);
    setError("");
    setDone("");
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Something went wrong.");
      if (resetOnSuccess) form.reset();
      setDone(successMessage ?? "Saved.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#ff5a1f]";
  const buttons = {
    dark: "bg-neutral-950 hover:bg-[#ff5a1f]",
    red: "bg-red-600 hover:bg-red-700",
    green: "bg-green-600 hover:bg-green-700",
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {fields.map((field) => (
        <label key={field.name} className={field.type === "checkbox" ? "flex items-center gap-3 text-sm font-semibold" : "block"}>
          {field.type === "checkbox" ? (
            <>
              <input type="checkbox" name={field.name} defaultChecked={Boolean(field.defaultValue)} className="h-4 w-4 accent-[#ff5a1f]" />
              {field.label}
            </>
          ) : (
            <>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-neutral-500">{field.label}</span>
              {field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  defaultValue={field.defaultValue as string | undefined}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={4}
                  className={input}
                />
              ) : field.type === "select" ? (
                <select name={field.name} defaultValue={field.defaultValue as string | undefined} required={field.required} className={input}>
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type ?? "text"}
                  name={field.name}
                  defaultValue={field.defaultValue as string | number | undefined}
                  placeholder={field.placeholder}
                  required={field.required}
                  step={field.step}
                  min={field.min}
                  max={field.max}
                  className={input}
                />
              )}
            </>
          )}
          {field.hint && <span className="mt-1 block text-xs text-neutral-500">{field.hint}</span>}
        </label>
      ))}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className={`rounded-xl px-5 py-3 text-sm font-black text-white transition disabled:opacity-50 ${buttons[variant]}`}
        >
          {busy ? "Working…" : submitLabel}
        </button>
        {done && !error && <span className="text-sm font-bold text-green-700">{done}</span>}
        {error && <span className="text-sm font-bold text-red-600">{error}</span>}
      </div>
    </form>
  );
}
