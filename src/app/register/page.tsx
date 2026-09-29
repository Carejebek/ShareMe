"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("RENTER");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to create your account.");
        return;
      }

      setMessage("Account created successfully. You can now log in.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("RENTER");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
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

          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-[#e62e1f]/25" />

          <div className="relative z-10 flex h-full flex-col justify-end p-14 text-white">
            <p className="text-sm font-black uppercase tracking-[0.5em] text-[#ff5a1f]">
              Join JayXZ
            </p>

            <h1 className="mt-5 max-w-xl text-6xl font-black leading-[0.95]">
              Drive More.
              <br />
              Pay Less.
            </h1>

            <p className="mt-6 max-w-lg text-xl leading-8 text-neutral-200">
              Create an account to rent exceptional vehicles or earn income by sharing your car.
            </p>

            <div className="mt-10 flex flex-wrap gap-6 text-sm font-semibold text-neutral-200">
              <span>✓ Verified hosts</span>
              <span>✓ Secure payments</span>
              <span>✓ 24/7 support</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white px-6 py-14 sm:px-10">
          <div className="w-full max-w-xl">
            <div className="mb-10">
              <p className="text-sm font-black uppercase tracking-[0.35em] text-[#e62e1f]">
                Get started
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight text-neutral-950">
                Create your account
              </h2>

              <p className="mt-3 text-neutral-600">
                Join JayXZ as a renter or host.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-2xl shadow-neutral-200/70"
            >
              <div className="space-y-6">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-neutral-800">
                    Full name
                  </span>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3.5 outline-none transition focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100"
                    placeholder="Enter your full name"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-neutral-800">
                    Email
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3.5 outline-none transition focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100"
                    placeholder="you@example.com"
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
                    minLength={8}
                    required
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3.5 outline-none transition focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100"
                    placeholder="At least 8 characters"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-neutral-800">
                    I want to
                  </span>

                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3.5 outline-none transition focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="RENTER">Rent cars</option>
                    <option value="HOST">List my car and earn</option>
                  </select>
                </label>

                {message && (
                  <div
                    className={
                      message.includes("successfully")
                        ? "rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"
                        : "rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                    }
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-4 font-black text-white shadow-lg shadow-red-950/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Creating account..." : "Create account"}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-neutral-600">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-black text-[#e62e1f] hover:text-[#ff5a1f]"
                >
                  Log in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
