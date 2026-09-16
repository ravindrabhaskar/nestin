import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { INDIAN_CITIES_DATA } from '../data/citiesData';
import { CityItem } from '../types';
import { CityCard } from './cities/CityCard';
import { useNavigate } from 'react-router-dom';

interface CityCarouselProps {
  onSelectCity?: (city: CityItem) => void;
  onViewAllCities?: () => void;
  isLoading?: boolean;
}

export const CityCarousel: React.FC<CityCarouselProps> = ({
  onSelectCity,
  onViewAllCities,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.75;
      const scrollAmount = direction === 'left' ? -amount : amount;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCardClick = (city: CityItem) => {
    if (onSelectCity) {
      onSelectCity(city);
    }
    navigate(`/find-pg?city=${encodeURIComponent(city.name)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewAllClick = () => {
    if (onViewAllCities) {
      onViewAllCities();
    }
    navigate('/cities');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="w-full bg-[#053222] text-white py-14 sm:py-20 relative overflow-hidden my-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        {/* HEADER ROW */}
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-heading leading-[1.15] tracking-tight">
            Explore PGs in<br />popular cities.
          </h2>

          <button
            type="button"
            onClick={handleViewAllClick}
            className="px-6 py-2.5 rounded-full border border-[#a3e635] text-[#a3e635] hover:bg-[#a3e635]/10 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            View all cities
          </button>
        </div>

        {/* CITIES CAROUSEL SCROLL TRACK */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="w-full h-[460px] rounded-[28px] bg-emerald-950/60 p-6 flex flex-col justify-end animate-pulse"
              >
                <div className="h-6 bg-emerald-800/60 rounded-xl w-32 mb-2" />
                <div className="h-4 bg-emerald-800/60 rounded-full w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div
              ref={scrollRef}
              className="flex gap-5 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory scroll-smooth items-stretch"
            >
              {INDIAN_CITIES_DATA.map((city, idx) => (
                <div
                  key={city.id}
                  className="snap-start shrink-0 w-64 sm:w-72 lg:w-[calc(25%-0.9375rem)] min-w-[260px]"
                >
                  <CityCard
                    city={city}
                    onClick={() => handleCardClick(city)}
                    index={idx}
                  />
                </div>
              ))}
            </div>

            {/* BOTTOM LEFT SCROLL NAVIGATION CONTROLS */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="w-10 h-10 rounded-full border border-white/30 text-white hover:border-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Previous cities"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scroll('right')}
                className="w-10 h-10 rounded-full border border-white/30 text-white hover:border-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Next cities"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};


