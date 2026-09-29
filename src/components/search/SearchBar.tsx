export default function SearchBar() {
  return (
    <div className="max-w-7xl mx-auto -mt-20 relative z-30 px-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">

        <div className="grid grid-cols-1 md:grid-cols-5">

          <div className="p-6 border-r">
            <p className="text-xs text-gray-500 uppercase font-bold">
              Where
            </p>
            <input
              placeholder="City, Airport or Address"
              className="w-full mt-2 outline-none text-lg"
            />
          </div>

          <div className="p-6 border-r">
            <p className="text-xs text-gray-500 uppercase font-bold">
              From
            </p>

            <input
              type="date"
              className="w-full mt-2 outline-none"
            />
          </div>

          <div className="p-6 border-r">
            <p className="text-xs text-gray-500 uppercase font-bold">
              Until
            </p>

            <input
              type="date"
              className="w-full mt-2 outline-none"
            />
          </div>

          <div className="p-6">
            <p className="text-xs text-gray-500 uppercase font-bold">
              Vehicle
            </p>

            <select className="w-full mt-2 outline-none">
              <option>All Vehicles</option>
              <option>Luxury</option>
              <option>SUV</option>
              <option>Sports</option>
              <option>Electric</option>
              <option>Truck</option>
            </select>
          </div>

          <button className="bg-[#ff5a1f] hover:bg-[#e64a19] text-white text-xl font-bold transition">
            Search
          </button>

        </div>

      </div>
    </div>
  );
}
