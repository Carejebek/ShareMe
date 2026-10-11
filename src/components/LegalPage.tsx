import type { ReactNode } from "react";

// Simple readable layout for Support, Terms and Privacy.
export default function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated?: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black text-neutral-950 md:text-5xl">{title}</h1>
          {updated && <p className="mt-3 text-neutral-500">Last updated {updated}</p>}
        </div>
      </section>
      <article className="mx-auto max-w-3xl space-y-4 px-6 py-10 leading-7 text-neutral-700 [&_h2]:pt-6 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-neutral-950 [&_li]:ml-5 [&_li]:list-disc [&_a]:font-bold [&_a]:text-[#e62e1f]">
        {children}
      </article>
    </main>
  );
}
