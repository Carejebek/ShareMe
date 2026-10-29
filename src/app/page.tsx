import Hero from "@/components/home/Hero";
import SearchBar from "@/components/search/SearchBar";
import QuickFilters from "@/components/home/QuickFilters";
import FeaturedVehicles from "@/components/home/FeaturedVehicles";
import BrowseBrands from "@/components/home/BrowseBrands";
import HowItWorks from "@/components/home/HowItWorks";
import RidePromo from "@/components/home/RidePromo";
import HostOpportunity from "@/components/home/HostOpportunity";
import WaitlistSignup from "@/components/home/WaitlistSignup";

// Render on every request so newly approved or removed cars show up immediately.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="bg-white">
      <Hero />
      <SearchBar />
      <QuickFilters />
      <FeaturedVehicles />
      <BrowseBrands />
      <HowItWorks />
      <RidePromo />
      <HostOpportunity />
      <WaitlistSignup />
    </main>
  );
}
