import Link from "next/link";
import { redirect } from "next/navigation";
import ChangePassword from "@/components/account/ChangePassword";
import LicenseUpload from "@/components/account/LicenseUpload";
import PhoneNumber from "@/components/account/PhoneNumber";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/rides";

export const dynamic = "force-dynamic";

const STATUS_TEXT: Record<string, { title: string; body: string; style: string }> = {
  UNVERIFIED: {
    title: "Not verified",
    body: "Hosts need a verified driver's licence before their cars can go live on JayXZ.",
    style: "bg-neutral-100 text-neutral-700",
  },
  PENDING: {
    title: "Waiting for review",
    body: "Thanks! A JayXZ admin will check your licence soon.",
    style: "bg-yellow-50 text-yellow-900",
  },
  VERIFIED: { title: "Verified", body: "Your driver's licence has been verified.", style: "bg-green-50 text-green-800" },
  REJECTED: { title: "Not accepted", body: "Please upload a new photo.", style: "bg-red-50 text-red-800" },
};

export default async function AccountPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login?callbackUrl=/account");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, phone: true, role: true, verificationStatus: true, verificationNote: true },
  });
  if (!user) redirect("/login");

  const status = STATUS_TEXT[user.verificationStatus];

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#ff5a1f]">Your account</p>
          <h1 className="mt-2 text-4xl font-black text-neutral-950">{user.name}</h1>
          <p className="mt-1 text-neutral-600">{user.email}</p>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black">Driver&apos;s licence</h2>
          <div className={`mt-4 rounded-2xl px-5 py-4 ${status.style}`}>
            <p className="font-black">{status.title}</p>
            <p className="mt-1 text-sm">{status.body}</p>
            {user.verificationStatus === "REJECTED" && user.verificationNote && (
              <p className="mt-2 text-sm">
                <strong>Reason:</strong> {user.verificationNote}
              </p>
            )}
          </div>
          {user.verificationStatus !== "VERIFIED" && (
            <div className="mt-5">
              <LicenseUpload resubmit={user.verificationStatus !== "UNVERIFIED"} />
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black">Mobile number</h2>
          <p className="mb-5 mt-2 text-sm text-neutral-600">
            We text you when a booking is confirmed or cancelled. Message and data rates may apply; reply STOP to any message to opt out.
          </p>
          <PhoneNumber initial={user.phone} />
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black">Trip issues &amp; claims</h2>
          <p className="mt-2 text-sm text-neutral-600">Report damage or another problem with a trip, and follow up on reports you&apos;ve made.</p>
          <Link href="/dashboard/claims" className="mt-4 inline-block font-black text-[#e62e1f]">
            Go to claims →
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="mb-5 text-xl font-black">Change password</h2>
          <ChangePassword />
        </div>
      </section>
    </main>
  );
}
