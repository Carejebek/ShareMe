import WaitlistForm from "@/components/waitlist/WaitlistForm";

export const metadata = { title: "Join the JayXZ waitlist" };

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">Coming soon</p>
          <h1 className="mt-3 text-4xl font-black text-neutral-950 md:text-5xl">Join the JayXZ waitlist</h1>
          <p className="mt-3 max-w-2xl text-lg text-neutral-600">
            Be the first to know when JayXZ rides, rentals and driving open near you. Leave your details and we&apos;ll get in touch.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <WaitlistForm />
        </div>
      </section>
    </main>
  );
}
