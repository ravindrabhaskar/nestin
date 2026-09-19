import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, MapPin, ArrowRight, X, Sparkles, Landmark, Building2, Waves } from 'lucide-react';
import { useCities, cityStaysLabel } from '../lib/usePlatformData';
import { LazyImage } from '../components/LazyImage';

interface Attraction {
  name: string;
  type?: 'landmark' | 'building' | 'waves' | 'nature';
}

const CITY_ATTRACTIONS_MAP: Record<string, Attraction[]> = {
  Bengaluru: [
    { name: 'Vidhana Soudha', type: 'landmark' },
    { name: 'Lalbagh', type: 'nature' },
  ],
  Hyderabad: [
    { name: 'Charminar', type: 'landmark' },
    { name: 'Golconda Fort', type: 'landmark' },
  ],
  Pune: [
    { name: 'Shaniwar Wada', type: 'landmark' },
    { name: 'Aga Khan Palace', type: 'landmark' },
  ],
  'Delhi NCR': [
    { name: 'India Gate', type: 'landmark' },
    { name: 'Qutub Minar', type: 'landmark' },
  ],
  Delhi: [
    { name: 'India Gate', type: 'landmark' },
    { name: 'Qutub Minar', type: 'landmark' },
  ],
  Chennai: [
    { name: 'Kapaleeshwarar', type: 'landmark' },
    { name: 'Marina Beach', type: 'waves' },
  ],
  Mumbai: [
    { name: 'Gateway of India', type: 'landmark' },
    { name: 'Marine Drive', type: 'waves' },
  ],
  Noida: [
    { name: 'Noida Skyline', type: 'building' },
    { name: 'Worlds of Wonder', type: 'nature' },
  ],
  Gurugram: [
    { name: 'CyberHub', type: 'building' },
    { name: 'Cyber City', type: 'building' },
  ],
  Ahmedabad: [
    { name: 'Sabarmati Riverfront', type: 'waves' },
    { name: 'Atal Bridge', type: 'landmark' },
  ],
  Jaipur: [
    { name: 'Hawa Mahal', type: 'landmark' },
    { name: 'Amer Fort', type: 'landmark' },
  ],
  Kolkata: [
    { name: 'Victoria Memorial', type: 'landmark' },
    { name: 'Howrah Bridge', type: 'landmark' },
  ],
  Kochi: [
    { name: 'Chinese Fishing Nets', type: 'waves' },
    { name: 'Fort Kochi', type: 'landmark' },
  ],
  'Chandigarh / Mohali': [
    { name: 'Capitol Complex', type: 'building' },
    { name: 'Rock Garden', type: 'nature' },
  ],
  Chandigarh: [
    { name: 'Capitol Complex', type: 'building' },
    { name: 'Rock Garden', type: 'nature' },
  ],
  Indore: [
    { name: 'Rajwada Palace', type: 'landmark' },
    { name: 'Lal Bagh', type: 'landmark' },
  ],
  Visakhapatnam: [
    { name: 'RK Beach', type: 'waves' },
    { name: 'Kailasagiri', type: 'nature' },
  ],
  Coimbatore: [
    { name: 'Adiyogi Shiva', type: 'landmark' },
    { name: 'Marudamalai', type: 'landmark' },
  ],
  Bhubaneswar: [
    { name: 'Lingaraj Temple', type: 'landmark' },
    { name: 'Udayagiri Caves', type: 'nature' },
  ],
  Lucknow: [
    { name: 'Rumi Darwaza', type: 'landmark' },
    { name: 'Bara Imambara', type: 'landmark' },
  ],
  Mysore: [
    { name: 'Mysore Palace', type: 'landmark' },
    { name: 'Chamundi Hill', type: 'nature' },
  ],
  Surat: [
    { name: 'Dumas Beach', type: 'waves' },
    { name: 'Surat Castle', type: 'landmark' },
  ],
  Nagpur: [
    { name: 'Deekshabhoomi', type: 'landmark' },
    { name: 'Futala Lake', type: 'waves' },
  ],
  Vadodara: [
    { name: 'Laxmi Vilas Palace', type: 'landmark' },
    { name: 'Sayaji Baug', type: 'nature' },
  ],
  Warangal: [
    { name: '1000 Pillar Temple', type: 'landmark' },
    { name: 'Warangal Fort', type: 'landmark' },
  ],
};

export const CitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { value: allCities } = useCities();

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return allCities;
    const q = searchQuery.toLowerCase().trim();
    return allCities.filter((city) => {
      const nameMatch = city.name.toLowerCase().includes(q);
      const stateMatch = city.state?.toLowerCase().includes(q);
      const localityMatch = city.popularLocalities?.some((loc) => loc.toLowerCase().includes(q));
      return nameMatch || stateMatch || localityMatch;
    });
  }, [searchQuery, allCities]);

  const handleCityClick = (cityName: string) => {
    navigate(`/find-pg?city=${encodeURIComponent(cityName)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#121820] pt-28 pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* HERO SECTION - EXACT MATCH TO APPROVED DESIGN */}
        <div className="space-y-4">
          <span className="text-[#a3e635] text-xs sm:text-sm font-bold uppercase tracking-widest font-heading block">
            WHERE WE OPERATE
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-heading tracking-tight text-[#121820] leading-[1.1]">
            Verified stays across <span className="text-[#a3e635]">Indian</span> cities.
          </h1>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl font-normal leading-relaxed pt-1">
            Pick a city to see live availability, transparent pricing and zero-brokerage move-ins.
          </p>

          {/* SEARCH BAR FOR QUICK FILTERING */}
          <div className="pt-4 max-w-xl">
            <div className="relative flex items-center bg-white rounded-full border border-slate-200/90 shadow-sm p-1.5 pl-5">
              <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, state, or locality..."
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-full transition-colors mr-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CITIES GRID - 3 COLUMNS MATCHING APPROVED DESIGN */}
        {filteredCities.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[28px] border border-slate-200/80 p-8 space-y-3">
            <MapPin className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-xl font-bold text-slate-900 font-heading">No cities found</h3>
            <p className="text-sm text-slate-500">No city matched "{searchQuery}". Try a different search.</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-5 py-2 rounded-full bg-[#a3e635] text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-[#92d428] transition-colors cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredCities.map((city, idx) => {
              const propertyCountText = cityStaysLabel(city, 'properties');
              const startingRentText = city.startingRent
                ? `Starting ₹${city.startingRent.toLocaleString('en-IN')}/month`
                : 'Be the first owner to list here';

              const attractions =
                CITY_ATTRACTIONS_MAP[city.name] ||
                (city.landmarks
                  ? city.landmarks.map((l) => ({ name: l, type: 'landmark' as const }))
                  : [{ name: 'Famous Landmarks', type: 'landmark' as const }]);

              return (
                <motion.div
                  key={city.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.4) }}
                  onClick={() => handleCityClick(city.name)}
                  className="group relative bg-white rounded-[28px] overflow-hidden border border-slate-200/80 shadow-nestin-md hover:shadow-nestin-floating transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  {/* TOP IMAGE WITH OVERLAY CITY NAME & ATTRACTIONS BADGE */}
                  <div className="relative w-full h-64 sm:h-72 overflow-hidden bg-slate-100">
                    <LazyImage
                      src={city.image}
                      alt={city.name}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      placeholderColor="bg-slate-800/40"
                    />
                    {/* GRADIENT OVERLAY FOR OPTIMAL TEXT READABILITY */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20 pointer-events-none z-1" />

                    {/* TOP OVERLAY: ATTRACTIONS BADGE & LANDMARKS ROW */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10 pointer-events-none">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/20 text-white shadow-md shrink-0">
                        <Sparkles className="w-3 h-3 text-[#a3e635] shrink-0" />
                        <span className="text-[10px] font-bold font-heading uppercase tracking-wider text-slate-200">
                          Attractions
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {attractions.slice(0, 2).map((item, i) => {
                          const IconComp =
                            item.type === 'building' ? Building2 : item.type === 'waves' ? Waves : Landmark;
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium shadow-sm transition-transform duration-300 group-hover:scale-105"
                            >
                              <IconComp className="w-3 h-3 text-[#a3e635] shrink-0" />
                              <span className="truncate max-w-[90px] sm:max-w-[110px] font-sans text-white/95">
                                {item.name}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* CITY NAME ON IMAGE */}
                    <div className="absolute bottom-4 left-5 right-5">
                      <h3 className="text-2xl sm:text-3xl font-bold text-white font-heading tracking-tight drop-shadow-md">
                        {city.name}
                      </h3>
                    </div>
                  </div>

                  {/* BOTTOM INFO BAR */}
                  <div className="p-5 sm:p-6 flex items-center justify-between gap-4 bg-white">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-sm sm:text-base font-bold text-[#121820] font-heading truncate">
                        {propertyCountText}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 font-normal truncate">{startingRentText}</div>
                    </div>

                    {/* EXPLORE PILL BUTTON */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCityClick(city.name);
                      }}
                      className="px-4 py-2.5 rounded-full bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs font-heading"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
