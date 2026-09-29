"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      const callbackUrl = "/";
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError("Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 pt-20">
      <section className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-2">
        <div className="relative hidden overflow-hidden lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/shareme-hero.jpg')",
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-[#e62e1f]/25" />

          <div className="relative z-10 flex h-full flex-col justify-end p-14 text-white">
            <p className="text-sm font-black uppercase tracking-[0.5em] text-[#ff5a1f]">
              Welcome back
            </p>

            <h1 className="mt-5 max-w-xl text-6xl font-black leading-[0.95]">
              Your next drive
              <br />
              starts here.
            </h1>

            <p className="mt-6 max-w-lg text-xl leading-8 text-neutral-200">
              Log in to manage your trips, vehicles, bookings and earnings.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white px-6 py-14 sm:px-10">
          <div className="w-full max-w-xl">
            <div className="mb-10">
              <p className="text-sm font-black uppercase tracking-[0.35em] text-[#e62e1f]">
                JayXZ
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight text-neutral-950">
                Log in to your account
              </h2>

              <p className="mt-3 text-neutral-600">
                Enter your email and password to continue.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-2xl shadow-neutral-200/70"
            >
              <div className="space-y-6">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-neutral-800">
                    Email
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3.5 outline-none transition focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-neutral-800">
                    Password
                  </span>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3.5 outline-none transition focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-4 font-black text-white shadow-lg shadow-red-950/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Log in"}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-neutral-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-black text-[#e62e1f] hover:text-[#ff5a1f]"
                >
                  Create account
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
