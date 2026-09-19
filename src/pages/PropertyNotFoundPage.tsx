import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, Search, Home, Sparkles, MapPin } from 'lucide-react';

export const PropertyNotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/find-pg?search=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/find-pg');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xl font-black font-heading tracking-tight text-slate-900 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-[#a3e635] flex items-center justify-center font-bold">
            N
          </div>
          <span>Nestin</span>
        </button>

        <button
          onClick={() => navigate('/find-pg')}
          className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-extrabold text-slate-800 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Search className="w-3.5 h-3.5 text-slate-600" />
          <span>Explore All PGs</span>
        </button>
      </div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg mx-auto w-full text-center my-auto py-12 px-6 bg-white rounded-3xl border border-slate-200/90 shadow-xl space-y-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-[#a3e635]/20 text-slate-900 mx-auto flex items-center justify-center">
          <Building2 className="w-10 h-10 text-slate-900" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Property Not Found</span>
          <h1 className="text-3xl font-black font-heading text-slate-900">Stay Unlisted or Not Found</h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            We couldn't find a property matching this link. The listing might have been rented out, updated, or the URL
            might have a typo.
          </p>
        </div>

        {/* Search Input */}
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 bg-[#FAF9F5] p-2 rounded-2xl border border-slate-200"
        >
          <MapPin className="w-4 h-4 text-emerald-600 ml-2 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, area or PG name..."
            className="w-full bg-transparent text-xs text-slate-900 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5 text-[#a3e635]" />
            <span>Search</span>
          </button>
        </form>

        {/* Popular Cities Links */}
        <div className="pt-2">
          <p className="text-[11px] font-bold text-slate-400 mb-2">Or browse stays by city:</p>
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
            {['Bengaluru', 'Hyderabad', 'Mumbai', 'Pune', 'Chennai', 'Delhi'].map((city) => (
              <button
                key={city}
                onClick={() => navigate(`/find-pg?city=${city}`)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/find-pg')}
            className="px-5 py-3 rounded-2xl bg-[#a3e635] text-slate-950 font-extrabold text-xs hover:bg-[#92d428] transition-all cursor-pointer shadow-xs flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Find All PG Stays</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-3 rounded-2xl bg-white border border-slate-300 text-slate-800 font-extrabold text-xs hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-2"
          >
            <Home className="w-4 h-4 text-slate-600" />
            <span>Home</span>
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-4">
        © Nestin Co-Living Technologies • Find verified student & professional PGs.
      </div>
    </div>
  );
};
