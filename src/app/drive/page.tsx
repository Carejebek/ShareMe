import Link from "next/link";
import LicenseUpload from "@/components/account/LicenseUpload";
import DriverApplication from "@/components/drive/DriverApplication";
import { formatMoney } from "@/lib/format";
import { RIDE_CURRENCY, RIDE_RATE_PER_MINUTE } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/rides";
import { getPlatformFeePercent } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Drive with JayXZ" };

const STATUS = {
  PENDING: { title: "Application under review", body: "We'll check your documents and let you know.", style: "bg-yellow-50 text-yellow-900" },
  APPROVED: { title: "You're approved to drive", body: "Open Dispatch to see ride requests near you.", style: "bg-green-50 text-green-800" },
  REJECTED: { title: "Not approved", body: "Please fix the issue below and resubmit.", style: "bg-red-50 text-red-800" },
} as const;

export default async function DrivePage() {
  const [sessionUser, feePercent] = await Promise.all([getSessionUser(), getPlatformFeePercent()]);
  const user = sessionUser
    ? await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { phone: true, verificationStatus: true, verificationNote: true, driverProfile: true },
      })
    : null;
  const profile = user?.driverProfile ?? null;
  const share = 100 - feePercent;
  const perMinute = formatMoney(RIDE_RATE_PER_MINUTE * (share / 100), RIDE_CURRENCY);
  const insuranceExpired = profile ? profile.insuranceExpiresAt < new Date() : false;

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">Drive with JayXZ</p>
          <h1 className="mt-3 text-4xl font-black text-neutral-950 md:text-5xl">Earn by driving riders</h1>
          <p className="mt-3 max-w-2xl text-lg text-neutral-600">
            Pick the rides you want. Riders pay by card before you set off, and you keep {share}% of every fare (about {perMinute} per
            minute of driving).
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["1. Apply", "Your licence, car details and insurance."],
            ["2. Get approved", "We check your documents, usually within 2 business days."],
            ["3. Drive", "We text you new ride requests. Accept the ones you want."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="font-black text-neutral-950">{title}</p>
              <p className="mt-2 text-sm text-neutral-600">{body}</p>
            </div>
          ))}
        </div>

        {!sessionUser || !user ? (
          <div className="rounded-3xl bg-white p-7 text-center shadow-sm">
            <p className="text-lg font-bold text-neutral-800">Create an account or log in to apply.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/register" className="rounded-xl bg-[#ff5a1f] px-6 py-3 font-black text-white">Sign up</Link>
              <Link href="/login?callbackUrl=/drive" className="rounded-xl border border-neutral-300 px-6 py-3 font-black text-neutral-900">Log in</Link>
            </div>
          </div>
        ) : (
          <>
            {profile && (
              <div className={`rounded-3xl px-7 py-5 ${STATUS[profile.status].style}`}>
                <p className="font-black">{STATUS[profile.status].title}</p>
                <p className="mt-1 text-sm">{STATUS[profile.status].body}</p>
                {profile.status === "REJECTED" && profile.reviewNote && (
                  <p className="mt-2 text-sm"><strong>Reason:</strong> {profile.reviewNote}</p>
                )}
                {insuranceExpired && <p className="mt-2 text-sm font-bold">Your insurance has expired. Upload your new insurance below.</p>}
                {profile.status === "APPROVED" && !insuranceExpired && (
                  <Link href="/dashboard/dispatch" className="mt-3 inline-block rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-black text-white">
                    Open Dispatch
                  </Link>
                )}
              </div>
            )}

            <div className="rounded-3xl bg-white p-7 shadow-sm">
              <h2 className="text-xl font-black">Step 1 · Driver&apos;s licence</h2>
              {user.verificationStatus === "VERIFIED" ? (
                <p className="mt-3 rounded-2xl bg-green-50 px-5 py-4 font-bold text-green-800">Your licence is verified.</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-neutral-600">
                    {user.verificationStatus === "PENDING"
                      ? "Your licence is waiting for review."
                      : user.verificationStatus === "REJECTED"
                        ? `Your licence wasn't accepted${user.verificationNote ? `: ${user.verificationNote}` : "."} Please upload a new photo.`
                        : "Upload a clear photo of the front of your licence."}
                  </p>
                  <div className="mt-5">
                    <LicenseUpload resubmit={user.verificationStatus !== "UNVERIFIED"} />
                  </div>
                </>
              )}
            </div>

            <div className="rounded-3xl bg-white p-7 shadow-sm">
              <h2 className="mb-5 text-xl font-black">Step 2 · Your car and insurance</h2>
              <DriverApplication
                existing={
                  profile && {
                    vehicleMake: profile.vehicleMake,
                    vehicleModel: profile.vehicleModel,
                    vehicleYear: profile.vehicleYear,
                    vehicleColor: profile.vehicleColor,
                    vehiclePlate: profile.vehiclePlate,
                    insuranceExpiresAt: profile.insuranceExpiresAt.toISOString().slice(0, 10),
                  }
                }
              />
            </div>

            <div className="rounded-3xl bg-white p-7 shadow-sm">
              <h2 className="text-xl font-black">Step 3 · Mobile number for ride alerts</h2>
              <p className="mt-2 text-sm text-neutral-600">
                {user.phone ? (
                  <>We&apos;ll text new ride requests to <strong>{user.phone}</strong>. </>
                ) : (
                  <>Add a mobile number so we can text you new ride requests. </>
                )}
                <Link href="/account" className="font-bold text-[#e62e1f]">{user.phone ? "Change it" : "Add it on your account page"}</Link>
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
