'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/CheckoutForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Note: the dynamic segment here is actually the bookingId returned from
// POST /api/bookings (kept as [listingId] to match the folder created earlier;
// feel free to rename the folder to [bookingId] for clarity).
export default function BookingPaymentPage() {
  const params = useParams();
  const bookingId = params.listingId as string;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function createIntent() {
      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not start payment.');
        return;
      }
      setClientSecret(data.clientSecret);
    }
    createIntent();
  }, [bookingId]);

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl border mt-8">
      <h1 className="text-2xl font-bold mb-6">Complete your booking</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm bookingId={bookingId} />
        </Elements>
      ) : (
        !error && <p className="text-gray-500">Preparing checkout...</p>
      )}
    </div>
  );
}
