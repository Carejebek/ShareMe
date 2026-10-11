import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Terms of Service | JayXZ" };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Service" updated="October 12, 2026">
      <p>
        These terms govern your use of JayXZ (the &quot;Platform&quot;), including the jayxz.com website and app. By creating an
        account or using the Platform you agree to them. If you don&apos;t agree, please don&apos;t use JayXZ.
      </p>

      <h2>1. What JayXZ does</h2>
      <p>
        JayXZ is a marketplace that connects people who want to rent a vehicle (&quot;Renters&quot;) with vehicle owners
        (&quot;Hosts&quot;), and riders with independent drivers (&quot;Drivers&quot;). JayXZ is not a party to the rental
        agreement between a Renter and a Host, and does not own the vehicles listed.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must be at least 18 years old and give accurate information.</li>
        <li>You are responsible for activity on your account and for keeping your password secure.</li>
        <li>Hosts must upload a valid driver&apos;s licence, which JayXZ reviews before their vehicles can be listed.</li>
        <li>We may suspend or close accounts that break these terms or put others at risk.</li>
      </ul>

      <h2>3. Renting a vehicle</h2>
      <ul>
        <li>The price shown at checkout, including any fees, is what you pay. Payments are processed securely by Stripe.</li>
        <li>Renters must hold a valid driver&apos;s licence, follow traffic laws, and return the vehicle on time and in the same condition.</li>
        <li>Damage or incidents must be reported promptly through Claims in your account.</li>
        <li>Refunds for cancellations or problems are decided by JayXZ and returned to the original payment method.</li>
      </ul>

      <h2>4. Hosting a vehicle</h2>
      <ul>
        <li>Hosts must own or have the right to rent the vehicle, keep it safe and roadworthy, and maintain any insurance the law requires.</li>
        <li>Listings are reviewed by JayXZ and may be rejected or removed.</li>
        <li>JayXZ keeps a platform fee from each completed rental; the remainder is paid to the Host. The current fee is shown when you list.</li>
      </ul>

      <h2>5. Rides</h2>
      <ul>
        <li>Ride prices are calculated from the estimated driving time between the pickup and destination you choose, and shown before you book.</li>
        <li>The price is fixed when you book. Rides are paid by card: we place a hold for the fare when you book and charge it when the trip is completed.</li>
        <li>Riders can cancel before the driver is on the way, and the hold is released. If no driver accepts the ride, it is cancelled and the hold is released.</li>
        <li>Drivers must hold a valid driver&apos;s licence and insurance, and are approved by JayXZ before they can accept rides. JayXZ keeps a platform fee from each fare and pays the rest to the driver.</li>
      </ul>

      <h2>6. Text messages (SMS)</h2>
      <p>
        If you give us your mobile number, you agree to receive transactional text messages from JayXZ about your account,
        bookings and rides, such as booking confirmations, cancellations and driver updates. We do not send marketing texts.
      </p>
      <ul>
        <li>Message frequency varies with your activity on JayXZ.</li>
        <li>Message and data rates may apply.</li>
        <li>Reply <strong>STOP</strong> to any message to stop receiving texts, or <strong>HELP</strong> for help. You can also remove your number on your account page.</li>
        <li>Mobile carriers are not liable for delayed or undelivered messages.</li>
        <li>Consent to texts is not a condition of any purchase.</li>
      </ul>
      <p>
        See our <Link href="/privacy">Privacy Policy</Link> for how we handle your phone number.
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        Don&apos;t misuse the Platform: no fraud, false listings, harassment, attempts to get around payments, or interfering
        with the Platform&apos;s security or other users.
      </p>

      <h2>8. Liability</h2>
      <p>
        The Platform is provided &quot;as is&quot;. To the extent the law allows, JayXZ is not liable for indirect or
        consequential losses, or for the acts of Renters, Hosts, Drivers or riders. Nothing in these terms limits liability
        that cannot be limited by law.
      </p>

      <h2>9. Changes</h2>
      <p>We may update these terms. We&apos;ll show the date of the latest version on this page, and continued use means you accept the changes.</p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms? Visit <Link href="/support">Support</Link>.
      </p>
    </LegalPage>
  );
}
