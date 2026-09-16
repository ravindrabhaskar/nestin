import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  Eye,
  Sparkles,
  MapPin,
  Share2,
  Lock,
} from 'lucide-react';
import { useAuth, DEFAULT_PRIVACY_SETTINGS } from '../../context/AuthContext';
import { UserPrivacySettings } from '../../types';

export const PrivacySettingsSection: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const initialSettings: UserPrivacySettings = user?.privacySettings || DEFAULT_PRIVACY_SETTINGS;
  const [settings, setSettings] = useState<UserPrivacySettings>(initialSettings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateSetting = (key: keyof UserPrivacySettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    updateUserProfile({ privacySettings: updated });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-black font-heading text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#5fa000]" />
            <span>Privacy & Data Control</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage who can see your profile and how your browsing data enhances your search.
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a3e635]/20 border border-[#a3e635]/50 text-[#3d6800] text-xs font-extrabold animate-fade-in font-heading">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Privacy settings updated</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        
        {/* 1. PROFILE VISIBILITY */}
        <div className="space-y-3">
          <div className="text-xs font-black uppercase tracking-wider text-slate-900 font-heading flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#5fa000]" />
            <span>Profile Visibility</span>
          </div>
          <p className="text-xs text-slate-500">
            Control how your basic profile (name & occupation) appears to roommates in coliving communities.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'verified_only',
                title: 'Verified Residents Only',
                desc: 'Only confirmed residents in the same PG can see your name and occupation.',
              },
              {
                id: 'public',
                title: 'Community Public',
                desc: 'Visible to all prospective flatmates looking for sharing rooms.',
              },
              {
                id: 'private',
                title: 'Private & Hidden',
                desc: 'Hidden from everyone except the property manager when you book.',
              },
            ].map((option) => {
              const isSelected = settings.profileVisibility === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => updateSetting('profileVisibility', option.id as any)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black font-heading ${isSelected ? 'text-[#a3e635]' : 'text-slate-900'}`}>
                        {option.title}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {option.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. PERSONALIZED RECOMMENDATIONS */}
        <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-heading">
              <Sparkles className="w-4 h-4 text-[#5fa000]" />
              <span>Smart Tailored Recommendations</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              Allow Nestin to use your previous views, price budget, and college/workplace to suggest matching hostels with higher accuracy.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.personalizedRecommendations}
            onClick={() => updateSetting('personalizedRecommendations', !settings.personalizedRecommendations)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.personalizedRecommendations ? 'bg-slate-900' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.personalizedRecommendations ? 'translate-x-5 bg-[#a3e635]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 3. LOCATION-BASED SEARCH */}
        <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-heading">
              <MapPin className="w-4 h-4 text-[#5fa000]" />
              <span>Location-Based Search Precision</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              Calculate walking commute distances to nearby metro stations, IT tech parks, and coaching institutes automatically.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.locationBasedRecommendations}
            onClick={() => updateSetting('locationBasedRecommendations', !settings.locationBasedRecommendations)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.locationBasedRecommendations ? 'bg-slate-900' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.locationBasedRecommendations ? 'translate-x-5 bg-[#a3e635]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 4. DATA SHARING WITH PROPERTIES */}
        <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-heading">
              <Share2 className="w-4 h-4 text-[#5fa000]" />
              <span>Property Owner KYC Sharing</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              Only share your emergency contact and uploaded ID documents with the verified property manager once you confirm a room booking.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.dataSharingPreferences}
            onClick={() => updateSetting('dataSharingPreferences', !settings.dataSharingPreferences)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.dataSharingPreferences ? 'bg-slate-900' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.dataSharingPreferences ? 'translate-x-5 bg-[#a3e635]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

      </div>

    </div>
  );
};
