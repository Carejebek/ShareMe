import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { getSupportContact } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support | JayXZ" };

const faqs = [
  ["How do I book a car?", <>Find a car on <Link href="/cars">Browse cars</Link>, choose your dates and pay securely by card. You&apos;ll see the booking under My Bookings.</>],
  ["How is a ride priced?", <>Rides cost a set amount per minute of driving from your pickup to your destination, using Google&apos;s drive time. You see the full price before you book and it doesn&apos;t change afterwards.</>],
  ["How do I cancel?", <>Open your booking or ride from your dashboard and choose Cancel. Rides can be cancelled until the driver is on the way.</>],
  ["Something went wrong on my trip", <>Report damage or another problem from <Link href="/dashboard/claims">Claims</Link>. Our team reviews every report.</>],
  ["How do I become a host?", <><Link href="/register">Create a host account</Link>, upload your driver&apos;s licence on your account page and list your car. We review each car before it goes live.</>],
  ["How do I stop text messages?", <>Reply STOP to any JayXZ text, or remove your number on your <Link href="/account">account page</Link>.</>],
] as const;

export default async function SupportPage() {
  const contact = await getSupportContact();
  const hasContact = contact.email || contact.phone;

  return (
    <LegalPage eyebrow="Help centre" title="How can we help?">
      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <h2 className="!pt-0">Contact us</h2>
        {hasContact ? (
          <ul className="mt-3 space-y-1">
            {contact.email && (
              <li>
                Email: <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </li>
            )}
            {contact.phone && (
              <li>
                Phone: <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a>
              </li>
            )}
            {contact.hours && <li>Hours: {contact.hours}</li>}
          </ul>
        ) : (
          <p className="mt-3">
            For help with a trip, use <Link href="/dashboard/claims">Claims</Link> from your account and our team will get back to you.
          </p>
        )}
      </div>

      <h2>Common questions</h2>
      <div className="space-y-3">
        {faqs.map(([question, answer]) => (
          <details key={question} className="group rounded-2xl bg-white p-5 shadow-sm">
            <summary className="cursor-pointer list-none font-black text-neutral-950">
              {question}
              <span className="float-right text-[#ff5a1f] transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3">{answer}</p>
          </details>
        ))}
      </div>

      <p className="pt-4 text-sm text-neutral-500">
        See also our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
