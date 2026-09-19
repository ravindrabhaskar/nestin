import React from 'react';
import { motion } from 'motion/react';
import { CityItem } from '../../types';
import { LazyImage } from '../LazyImage';
import { cityStaysLabel } from '../../lib/usePlatformData';

interface CityCardProps {
  city: CityItem;
  onClick: () => void;
  index?: number;
  className?: string;
}

export const CityCard: React.FC<CityCardProps> = ({ city, onClick, index = 0, className = '' }) => {
  const staysCount = cityStaysLabel(city);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={onClick}
      className={`group relative w-full h-[460px] rounded-[28px] overflow-hidden cursor-pointer bg-slate-950 shadow-nestin-md hover:shadow-nestin-floating transition-all duration-300 select-none flex flex-col justify-end ${className}`}
    >
      {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <LazyImage
          src={city.image}
          alt={city.name}
          useMotion
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
          className="w-full h-full"
          imgClassName="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          placeholderColor="bg-[#052b1d]"
        />
      </div>

      {/* GRADIENT OVERLAY FOR TEXT READABILITY */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none z-10" />

      {/* BOTTOM CONTENT: CITY NAME & STAYS */}
      <div className="relative z-20 p-6 space-y-0.5">
        <h3 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight">{city.name}</h3>
        <p className="text-sm text-slate-300 font-normal">{staysCount}</p>
      </div>
    </motion.div>
  );
};
