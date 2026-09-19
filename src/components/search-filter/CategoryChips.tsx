import React from 'react';
import { motion } from 'motion/react';
import { Building2, User, UserCheck, Users } from 'lucide-react';

interface CategoryCounts {
  all: number;
  boys: number;
  girls: number;
  coliving: number;
}

interface CategoryChipsProps {
  currentGender: string;
  onSelectCategory: (genderId: string) => void;
  counts: CategoryCounts;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({ currentGender, onSelectCategory, counts }) => {
  const CATEGORIES = [
    {
      id: 'Any',
      label: 'All PGs',
      icon: Building2,
      count: counts.all,
      accentColor: 'text-slate-700',
    },
    {
      id: 'Boys',
      label: "Men's PG",
      icon: User,
      count: counts.boys,
      accentColor: 'text-blue-600',
    },
    {
      id: 'Girls',
      label: "Women's PG",
      icon: UserCheck,
      count: counts.girls,
      accentColor: 'text-pink-600',
    },
    {
      id: 'Co-living',
      label: 'Co-living PG',
      icon: Users,
      count: counts.coliving,
      accentColor: 'text-purple-600',
    },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-2 border border-slate-200/90 shadow-nestin-md flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 pl-3 pr-1 shrink-0 font-heading hidden sm:inline-block">
        CATEGORY:
      </span>

      <div className="flex items-center gap-2">
        {CATEGORIES.map((cat) => {
          const isSelected =
            currentGender === cat.id ||
            (cat.id === 'Boys' && (currentGender === 'Men' || currentGender === "Men's")) ||
            (cat.id === 'Girls' && (currentGender === 'Women' || currentGender === "Women's"));
          const Icon = cat.icon;

          return (
            <motion.button
              key={cat.id}
              type="button"
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectCategory(cat.id)}
              className={`relative px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2.5 transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-gradient-to-r from-[#b0f040] to-[#a3e635] text-slate-950 border-[#88d900] shadow-[0_4px_16px_rgba(163,230,53,0.35)]'
                  : 'bg-stone-50/80 hover:bg-stone-100 text-slate-700 hover:text-slate-900 border-slate-200/70'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-950' : cat.accentColor}`} />
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-tight transition-colors ${
                  isSelected ? 'bg-slate-950 text-white shadow-xs' : 'bg-slate-200/80 text-slate-800'
                }`}
              >
                {cat.count}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
