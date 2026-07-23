'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-brand-600">
          ShareRide
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-brand-600">
            Browse
          </Link>
          {session?.user ? (
            <>
              <Link href="/listings/new" className="hover:text-brand-600">
                List your car
              </Link>
              <Link href="/dashboard/bookings" className="hover:text-brand-600">
                My bookings
              </Link>
              <Link href="/dashboard/listings" className="hover:text-brand-600">
                My listings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-md bg-gray-100 px-3 py-1.5 hover:bg-gray-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-brand-600">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
