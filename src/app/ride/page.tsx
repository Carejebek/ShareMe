import RideBooking from '@/components/ride/RideBooking';
import { isValidPlaceId } from '@/lib/maps';
import { RIDE_CURRENCY, RIDE_RATE_PER_MINUTE } from '@/lib/pricing';
import { formatMoney } from '@/lib/format';

export const metadata = {
  title: 'Book a Ride | JayXZ',
  description: 'Book a ride with an upfront price based on the drive time from your pickup to your destination.'
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Addresses chosen on the homepage arrive as ?pu=<placeId>&pua=<address>&do=..&doa=..
function address(params: Record<string, string | string[] | undefined>, id: string, text: string) {
  const placeId = String(params[id] ?? '');
  const label = String(params[text] ?? '').slice(0, 300);
  return isValidPlaceId(placeId) && label ? { placeId, address: label } : null;
}

export default async function RidePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rate = formatMoney(RIDE_RATE_PER_MINUTE, RIDE_CURRENCY);

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5a1f]">JayXZ Rides</p>
          <h1 className="mt-3 text-4xl font-black text-neutral-950 md:text-5xl">Book a ride</h1>
          <p className="mt-3 max-w-2xl text-lg text-neutral-600">
            Enter where you are and where you are going. You see the price before you book: {rate} for every
            minute of the drive from your pickup to your destination.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <RideBooking initialPickup={address(params, 'pu', 'pua')} initialDropoff={address(params, 'do', 'doa')} />
      </section>
    </main>
  );
}
