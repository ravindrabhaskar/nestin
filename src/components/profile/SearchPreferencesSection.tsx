import React, { useState } from 'react';
import {
  Search,
  Wifi,
  Zap,
  Sparkles,
  Shield,
  Coffee,
  CheckCircle2,
  Tv,
  Waves,
  Dumbbell,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SearchPreferencesSection: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  
  const defaultAmenitiesList = [
    { id: 'wifi', name: 'High-Speed WiFi', icon: Wifi },
    { id: 'power', name: '100% Power Backup', icon: Zap },
    { id: 'cleaning', name: 'Daily Room Housekeeping', icon: Sparkles },
    { id: 'security', name: '24/7 CCTV & Security', icon: Shield },
    { id: 'water', name: 'RO Purified Drinking Water', icon: Coffee },
    { id: 'washing', name: 'Automatic Washing Machine', icon: Waves },
    { id: 'gym', name: 'Fitness Gym & Yoga Area', icon: Dumbbell },
    { id: 'tv', name: 'Smart TV & Lounge Access', icon: Tv },
  ];

  const currentAmenities = user?.livingPreferences?.selectedAmenities || [
    'High-Speed WiFi',
    'Daily Room Housekeeping',
    '100% Power Backup',
    'Automatic Washing Machine',
    'RO Purified Drinking Water',
    '24/7 CCTV & Security',
  ];

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(currentAmenities);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleAmenity = (name: string) => {
    if (selectedAmenities.includes(name)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== name));
    } else {
      setSelectedAmenities([...selectedAmenities, name]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const prevPrefs = user?.livingPreferences || {} as any;
    updateUserProfile({
      livingPreferences: {
        ...prevPrefs,
        selectedAmenities,
      },
    });

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    }, 300);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-7 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-black font-heading text-slate-900 tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-[#5fa000]" />
            <span>Search & Filter Defaults</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose must-have amenities and criteria to auto-filter results on the Find PG page.
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a3e635]/20 border border-[#a3e635]/50 text-[#3d6800] text-xs font-extrabold animate-fade-in font-heading">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Search defaults saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* AMENITIES CHECKLIST */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-800 font-heading">
            Must-Have Amenities (Quick Filter)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {defaultAmenitiesList.map((item) => {
              const IconComp = item.icon;
              const isChecked = selectedAmenities.includes(item.name);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleAmenity(item.name)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isChecked
                      ? 'bg-[#a3e635]/15 border-[#a3e635] text-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isChecked ? 'bg-[#a3e635] text-slate-950' : 'bg-slate-200/80 text-slate-600'}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold font-heading">{item.name}</span>
                  </div>

                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    isChecked ? 'bg-slate-900 border-slate-900 text-[#a3e635]' : 'bg-white border-slate-300'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
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
                <span>Save Search Preferences</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
