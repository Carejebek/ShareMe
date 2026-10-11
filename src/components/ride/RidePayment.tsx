'use client';

import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { formatMoney } from '@/lib/format';

// Card step for a ride: places a hold for the fare. The card is only charged when the trip is completed.
export default function RidePayment({
  rideId,
  amount,
  currency,
  onCancel
}: {
  rideId: string;
  amount: number;
  currency: string;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError('');

    const { error: cardError } = await stripe.confirmPayment({
      elements,
      // Only leaves the page if the bank needs an extra check (3-D Secure); then comes back to My Rides.
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/dashboard/rides?booked=1&ride=${rideId}` }
    });
    if (cardError) {
      setError(cardError.message || 'Your card was declined.');
      setBusy(false);
      return;
    }

    const res = await fetch(`/api/rides/${rideId}/payment`, { method: 'POST' });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || 'We could not confirm your payment.');
      setBusy(false);
      return;
    }
    router.push('/dashboard/rides?booked=1');
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <p className="text-xs text-neutral-500">
        We place a hold of {formatMoney(amount, currency)} on your card now and charge it when your trip is completed. If no driver
        accepts or you cancel before pickup, the hold is released.
      </p>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || busy}
        className="w-full rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Confirming…' : `Confirm and pay ${formatMoney(amount, currency)}`}
      </button>
      <button type="button" onClick={onCancel} disabled={busy} className="w-full text-sm font-bold text-neutral-500 hover:text-neutral-900">
        Change ride details
      </button>
    </form>
  );
}
