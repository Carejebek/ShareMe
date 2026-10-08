import RideBooking from '@/components/ride/RideBooking';

export const metadata = {
  title: 'Book a Ride | JayXZ',
  description: 'Book a ride with an upfront price. $1 per minute.'
};

export default function RidePage() {
  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">JayXZ Rides</p>
          <h1 className="mt-3 text-4xl font-black text-neutral-950 md:text-5xl">Book a ride</h1>
          <p className="mt-3 max-w-2xl text-lg text-neutral-600">
            Enter where you are and where you are going. You see the price before you book: $1 for every
            minute of the trip.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <RideBooking />
      </section>
    </main>
  );
}
