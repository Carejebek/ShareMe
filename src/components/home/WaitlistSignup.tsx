import WaitlistForm from "@/components/waitlist/WaitlistForm";

export default function WaitlistSignup() {
  return (
    <section id="waitlist" className="scroll-mt-24 bg-[#f7f7f7] py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">Join the waitlist</p>
          <h2 className="mt-5 text-5xl font-black leading-tight text-neutral-950">
            Be first in line
            <br />
            when we launch.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
            JayXZ is opening city by city. Leave your details and we&apos;ll let you know as soon as rides, rentals and
            driving are available near you.
          </p>
          <ul className="mt-8 space-y-3 font-bold text-neutral-800">
            <li>✓ Early access in your city</li>
            <li>✓ Launch updates by email</li>
            <li>✓ No spam, ever</li>
          </ul>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
