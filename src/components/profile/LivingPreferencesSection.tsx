import React, { useState } from 'react';
import {
  Sliders,
  MapPin,
  Building2,
  Users,
  Utensils,
  Calendar,
  Sparkles,
  CheckCircle2,
  Bed,
  Wind,
  Bath,
  Armchair,
} from 'lucide-react';
import { useAuth, DEFAULT_LIVING_PREFERENCES } from '../../context/AuthContext';
import { UserLivingPreferences } from '../../types';

export const LivingPreferencesSection: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  
  const initialPrefs: UserLivingPreferences = user?.livingPreferences || DEFAULT_LIVING_PREFERENCES;
  const [prefs, setPrefs] = useState<UserLivingPreferences>(initialPrefs);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const roomTypeOptions = ['Single', 'Double', 'Triple', 'Four Sharing', 'Private Studio'];
  const pgTypeOptions: ('Any' | 'Boys' | 'Girls' | 'Co-Living')[] = ['Co-Living', 'Boys', 'Girls', 'Any'];
  const foodOptions: ('Any' | 'Veg' | 'Non-Veg' | 'Food Included' | 'Self Cooking')[] = [
    'Food Included',
    'Veg',
    'Non-Veg',
    'Self Cooking',
    'Any',
  ];

  const toggleRoomType = (rt: string) => {
    if (prefs.preferredRoomType.includes(rt)) {
      if (prefs.preferredRoomType.length > 1) {
        setPrefs({
          ...prefs,
          preferredRoomType: prefs.preferredRoomType.filter((t) => t !== rt),
        });
      }
    } else {
      setPrefs({
        ...prefs,
        preferredRoomType: [...prefs.preferredRoomType, rt],
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    updateUserProfile({ livingPreferences: prefs });

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    }, 350);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-8 font-sans">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-black font-heading text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#5fa000]" />
            <span>Living Preferences</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Customize your ideal stay criteria to receive tailored PG recommendations and smart alerts.
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a3e635]/20 border border-[#a3e635]/50 text-[#3d6800] text-xs font-extrabold animate-fade-in font-heading">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Preferences saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-7">
        
        {/* CITY & LOCALITY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Preferred City</span>
            </label>
            <select
              value={prefs.preferredCity}
              onChange={(e) => setPrefs({ ...prefs, preferredCity: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all"
            >
              <option value="Hyderabad">Hyderabad</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Chennai">Chennai</option>
              <option value="Pune">Pune</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi-NCR">Delhi-NCR</option>
              <option value="Kota">Kota</option>
              <option value="Kolkata">Kolkata</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Preferred Area / Tech Hub</span>
            </label>
            <input
              type="text"
              value={prefs.preferredArea}
              onChange={(e) => setPrefs({ ...prefs, preferredArea: e.target.value })}
              placeholder="e.g. Kukatpally, Hitec City, Gachibowli"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* PG TYPE & GENDER PREFERENCE */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Preferred PG / Stay Type</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {pgTypeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPrefs({ ...prefs, preferredPgType: option, genderPreference: option })}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer font-heading ${
                  prefs.preferredPgType === option
                    ? 'bg-slate-900 text-[#a3e635] border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* ROOM TYPES MULTI-SELECT */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between font-heading">
            <div className="flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-slate-400" />
              <span>Preferred Room Sharing</span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">Select all that apply</span>
          </label>
          <div className="flex flex-wrap gap-2.5">
            {roomTypeOptions.map((rt) => {
              const isSelected = prefs.preferredRoomType.includes(rt);
              return (
                <button
                  key={rt}
                  type="button"
                  onClick={() => toggleRoomType(rt)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 font-heading ${
                    isSelected
                      ? 'bg-[#a3e635]/25 border-[#a3e635] text-slate-950 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#5fa000]" />}
                  <span>{rt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MONTHLY BUDGET SLIDER */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 font-heading">
              Monthly Budget Range
            </label>
            <div className="text-xs font-black text-slate-900 bg-white px-3 py-1 rounded-full border border-slate-200 font-heading">
              ₹{prefs.budgetMin.toLocaleString()} – ₹{prefs.budgetMax.toLocaleString()} / mo
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">Minimum Budget: ₹{prefs.budgetMin.toLocaleString()}</div>
              <input
                type="range"
                min="4000"
                max="15000"
                step="500"
                value={prefs.budgetMin}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val <= prefs.budgetMax) {
                    setPrefs({ ...prefs, budgetMin: val });
                  }
                }}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">Maximum Budget: ₹{prefs.budgetMax.toLocaleString()}</div>
              <input
                type="range"
                min="10000"
                max="30000"
                step="500"
                value={prefs.budgetMax}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= prefs.budgetMin) {
                    setPrefs({ ...prefs, budgetMax: val });
                  }
                }}
                className="w-full accent-[#a3e635] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* FOOD & MOVE-IN DATE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <Utensils className="w-3.5 h-3.5 text-slate-400" />
              <span>Food Preference</span>
            </label>
            <select
              value={prefs.foodPreference}
              onChange={(e) => setPrefs({ ...prefs, foodPreference: e.target.value as any })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all"
            >
              {foodOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Target Move-in Date</span>
            </label>
            <input
              type="date"
              value={prefs.moveInDate}
              onChange={(e) => setPrefs({ ...prefs, moveInDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* ROOM SPECIFICATIONS (AC, ATTACHED BATH, FURNISHING) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-heading">
              <Wind className="w-3.5 h-3.5 text-slate-500" />
              <span>Air Conditioning</span>
            </div>
            <select
              value={prefs.acPreference || 'AC'}
              onChange={(e) => setPrefs({ ...prefs, acPreference: e.target.value as any })}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
            >
              <option value="AC">AC Required</option>
              <option value="Non-AC">Non-AC</option>
              <option value="Any">Either / Any</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-heading">
              <Bath className="w-3.5 h-3.5 text-slate-500" />
              <span>Bathroom Type</span>
            </div>
            <select
              value={prefs.attachedBathroom ? 'attached' : 'any'}
              onChange={(e) => setPrefs({ ...prefs, attachedBathroom: e.target.value === 'attached' })}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
            >
              <option value="attached">Attached Bathroom Only</option>
              <option value="any">Attached or Common</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-heading">
              <Armchair className="w-3.5 h-3.5 text-slate-500" />
              <span>Furnishing Level</span>
            </div>
            <select
              value={prefs.furnishing || 'Fully Furnished'}
              onChange={(e) => setPrefs({ ...prefs, furnishing: e.target.value as any })}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
            >
              <option value="Fully Furnished">Fully Furnished</option>
              <option value="Semi-Furnished">Semi-Furnished</option>
              <option value="Unfurnished">Unfurnished</option>
              <option value="Any">Any</option>
            </select>
          </div>

        </div>

        {/* SAVE BUTTON */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-[#a3e635] hover:bg-slate-800 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 font-heading"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Living Preferences</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
