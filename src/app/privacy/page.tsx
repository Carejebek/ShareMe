import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy | JayXZ" };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" updated="October 12, 2026">
      <p>This policy explains what personal information JayXZ collects, how we use it and the choices you have.</p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address, password (stored encrypted) and, if you add it, your mobile number.</li>
        <li><strong>Verification:</strong> hosts upload a photo of their driver&apos;s licence. It is stored privately and only JayXZ administrators can view it.</li>
        <li><strong>Bookings and rides:</strong> the cars you book or list, dates, pickup and drop-off addresses, prices and messages to drivers.</li>
        <li><strong>Location:</strong> only if you tap &quot;Use my current location&quot;, to find your pickup address. We don&apos;t track your location in the background.</li>
        <li><strong>Payments:</strong> card payments are handled by Stripe. We don&apos;t store your full card number.</li>
        <li><strong>Technical data:</strong> basic logs such as IP address and browser type, used for security and to prevent abuse.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account, bookings, rides, payments, refunds and host payouts.</li>
        <li>To verify hosts and keep the marketplace safe, including investigating claims and suspending accounts that break our terms.</li>
        <li>To send you transactional emails and text messages about your bookings and rides.</li>
        <li>To meet legal, tax and accounting obligations.</li>
      </ul>

      <h2>Text messages and your phone number</h2>
      <p>
        We use your mobile number only to send transactional texts about your account, bookings and rides. Reply STOP to opt out
        at any time. <strong>We do not sell or share your mobile number or SMS opt-in information with third parties or affiliates
        for marketing or promotional purposes.</strong> Texts are delivered through our SMS provider, Twilio, which processes your
        number only to deliver our messages.
      </p>

      <h2>Who we share information with</h2>
      <ul>
        <li><strong>Other users, as needed for a trip:</strong> for example, a host sees the renter&apos;s name for a booking, and a driver sees the rider&apos;s pickup, destination and phone number.</li>
        <li><strong>Service providers:</strong> Stripe (payments), Twilio (text messages), Google Maps Platform (address search and route times) and our hosting provider. They may only use the information to provide their service to us.</li>
        <li><strong>When required by law,</strong> or to protect the safety of our users and the public.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>How long we keep it</h2>
      <p>We keep your information while your account is open and afterwards as long as needed for legal, tax, dispute and safety reasons.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Update your phone number or password on your <Link href="/account">account page</Link>.</li>
        <li>Ask us for a copy of your information, or to correct or delete it, through <Link href="/support">Support</Link>.</li>
      </ul>

      <h2>Security</h2>
      <p>Passwords are hashed, licence photos are kept out of public storage, and connections to JayXZ are encrypted (HTTPS).</p>

      <h2>Changes</h2>
      <p>We may update this policy and will show the date of the latest version on this page.</p>

      <h2>Contact</h2>
      <p>
        Questions about your privacy? Visit <Link href="/support">Support</Link>.
      </p>
    </LegalPage>
  );
}
