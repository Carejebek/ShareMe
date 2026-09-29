import Hero from "@/components/home/Hero";
import SearchBar from "@/components/search/SearchBar";
import QuickFilters from "@/components/home/QuickFilters";
import FeaturedVehicles from "@/components/home/FeaturedVehicles";
import BrowseBrands from "@/components/home/BrowseBrands";
import ImpactStats from "@/components/home/ImpactStats";
import HowItWorks from "@/components/home/HowItWorks";
import HostOpportunity from "@/components/home/HostOpportunity";


const categories = [
  { name: "Luxury", icon: "◆" },
  { name: "SUV", icon: "🚙" },
  { name: "Sports", icon: "🏎️" },
  { name: "Electric", icon: "⚡" },
  { name: "Van", icon: "🚐" },
  { name: "Truck", icon: "🚚" },
];

export default function HomePage() {
  return (
    <main className="bg-white">
      <Hero />
      <SearchBar />
      <QuickFilters />
      <FeaturedVehicles />
      <BrowseBrands />
      <ImpactStats />
      <HowItWorks />
      <HostOpportunity />

      <section id="categories" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="font-bold uppercase tracking-[0.25em] text-[#e62e1f]">
            Explore options
          </p>

          <h2 className="mt-3 text-4xl font-extrabold text-gray-950 md:text-5xl">
            Browse by Category
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              className="group flex min-h-32 items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 shadow-lg transition hover:-translate-y-2 hover:border-[#ff5a1f] hover:shadow-2xl"
            >
              <span className="text-4xl transition group-hover:scale-110">
                {category.icon}
              </span>

              <span className="text-lg font-bold text-gray-900">
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-gray-950 py-24 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="font-bold uppercase tracking-[0.25em] text-[#ff5a1f]">
              Simple and secure
            </p>

            <h2 className="mt-3 text-4xl font-extrabold md:text-5xl">
              How JayXZ Works
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              ["01", "Find your car", "Search by location, travel dates and vehicle type."],
              ["02", "Book securely", "Choose your vehicle and complete your reservation online."],
              ["03", "Drive and enjoy", "Meet your host, collect the car and begin your trip."],
            ].map(([number, title, text]) => (
              <div
                key={number}
                className="rounded-3xl border border-white/10 bg-white/5 p-9 backdrop-blur"
              >
                <span className="text-5xl font-black text-[#ff5a1f]">{number}</span>
                <h3 className="mt-6 text-2xl font-bold">{title}</h3>
                <p className="mt-4 leading-7 text-gray-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#c91f17] via-[#e62e1f] to-[#ff5a1f] py-24 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-4xl font-extrabold md:text-6xl">
            Turn Your Car Into Income
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-xl text-white/90">
            List your vehicle, choose your availability and start earning when your car would otherwise be parked.
          </p>

          <a
            href="/register"
            className="mt-10 inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-[#e62e1f] shadow-xl transition hover:scale-105"
          >
            Become a Host
          </a>
        </div>
      </section>

      <footer id="support" className="bg-black py-12 text-gray-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-3xl font-extrabold text-white">
              Jay<span className="text-[#ff5a1f]">XZ</span>
            </h3>
            <p className="mt-2">Drive Smart. Travel Better.</p>
          </div>

          <div className="flex flex-wrap gap-8">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Support</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
