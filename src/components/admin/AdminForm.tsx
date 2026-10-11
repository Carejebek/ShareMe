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
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
  const buttons = {
    dark: "bg-slate-900 hover:bg-slate-700",
    red: "bg-rose-600 hover:bg-rose-700",
    green: "bg-emerald-600 hover:bg-emerald-700",
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      {fields.map((field) => (
        <label key={field.name} className={field.type === "checkbox" ? "flex items-center gap-2.5 text-[13px] font-medium text-slate-700" : "block"}>
          {field.type === "checkbox" ? (
            <>
              <input type="checkbox" name={field.name} defaultChecked={Boolean(field.defaultValue)} className="h-4 w-4 rounded border-slate-300 accent-slate-900" />
              {field.label}
            </>
          ) : (
            <>
              <span className="mb-1 block text-[13px] font-medium text-slate-700">{field.label}</span>
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
          {field.hint && <span className="mt-1 block text-xs text-slate-500">{field.hint}</span>}
        </label>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={busy}
          className={`h-9 rounded-md px-4 text-[13px] font-medium text-white shadow-sm transition disabled:opacity-50 ${buttons[variant]}`}
        >
          {busy ? "Working…" : submitLabel}
        </button>
        {done && !error && <span className="text-[13px] font-medium text-emerald-700">{done}</span>}
        {error && <span className="text-[13px] font-medium text-rose-600">{error}</span>}
      </div>
    </form>
  );
}
