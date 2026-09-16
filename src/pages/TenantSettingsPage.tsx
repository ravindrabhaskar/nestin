import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Check,
  Shield,
  Laptop,
  Smartphone,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TenantAccountLayout } from '../components/profile/TenantAccountLayout';

export const TenantSettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path or search params
  const searchParams = new URLSearchParams(location.search);
  const queryTab = searchParams.get('tab');
  
  let activeTab: 'notifications' | 'preferences' | 'security' | 'privacy' = 'notifications';
  if (location.pathname.includes('/settings/preferences') || queryTab === 'preferences') {
    activeTab = 'preferences';
  } else if (location.pathname.includes('/settings/security') || queryTab === 'security') {
    activeTab = 'security';
  } else if (location.pathname.includes('/settings/privacy') || queryTab === 'privacy') {
    activeTab = 'privacy';
  } else {
    activeTab = 'notifications';
  }

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. NOTIFICATIONS STATE
  const [notifications, setNotifications] = useState({
    bookingConfirmations: true,
    bookingUpdates: true,
    cancellationUpdates: true,
    visitConfirmations: true,
    visitReminders: true,
    visitChanges: true,
    propertyRecommendations: true,
    offersAndUpdates: false,
  });

  // 2. SEARCH PREFERENCES STATE
  const [searchPrefs, setSearchPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('nestin_search_prefs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      city: 'Bangalore',
      area: 'Koramangala, HSR Layout',
      budget: '₹10,000 - ₹15,000',
      roomType: 'Single & Double Sharing',
      moveInDate: 'Within 15 days',
      amenities: ['AC', 'Food Included', 'Furnished', 'Attached Bathroom'],
    };
  });

  // 3. PRIVACY STATE
  const [privacySettings, setPrivacySettings] = useState({
    personalizedRecommendations: true,
    locationRecommendations: true,
    marketingCommunications: false,
  });

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('nestin_notifications_settings', JSON.stringify(notifications));
    } catch {}
    showToast('Changes saved successfully.');
  };

  const handleSaveSearchPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('nestin_search_prefs', JSON.stringify(searchPrefs));
    } catch {}
    showToast('Changes saved successfully.');
  };

  const handleSavePrivacy = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('nestin_privacy_settings', JSON.stringify(privacySettings));
    } catch {}
    showToast('Changes saved successfully.');
  };

  const toggleAmenity = (amenity: string) => {
    setSearchPrefs((prev: any) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a: string) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const handleDeleteAccount = async () => {
    setDeleteModalOpen(false);
    try {
      localStorage.clear();
    } catch {}
    await logout();
    navigate('/');
  };

  // Header texts based on active tab
  const getPageInfo = () => {
    switch (activeTab) {
      case 'notifications':
        return {
          title: 'Notifications',
          subtitle: 'Choose how Nestin keeps you updated.',
        };
      case 'preferences':
        return {
          title: 'Search Preferences',
          subtitle: "Tell us what you're looking for so we can show better PG recommendations.",
        };
      case 'security':
        return {
          title: 'Security',
          subtitle: 'Manage your account security.',
        };
      case 'privacy':
        return {
          title: 'Privacy',
          subtitle: 'Control how your information is used.',
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <TenantAccountLayout
      title={pageInfo.title}
      subtitle={pageInfo.subtitle}
      activeNav={`/settings/${activeTab}`}
    >
      {/* SUCCESS TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-[#a3e635] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold font-heading border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-[#a3e635]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveNotifications} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-8">
            
            {/* GROUP 1: BOOKINGS */}
            <div>
              <h3 className="text-sm font-bold font-heading text-slate-900 mb-1">
                Bookings
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Notifications regarding your PG reservations and room allotment.
              </p>

              <div className="divide-y divide-slate-100">
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 font-heading">
                      Booking confirmations
                    </div>
                    <div className="text-xs text-slate-500">
                      Receive immediate confirmation when you reserve a bed or room.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.bookingConfirmations}
                      onChange={(e) =>
                        setNotifications({ ...notifications, bookingConfirmations: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 font-heading">
                      Booking updates
                    </div>
                    <div className="text-xs text-slate-500">
                      Get notified about check-in status, room allotment, and move-in details.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.bookingUpdates}
                      onChange={(e) =>
                        setNotifications({ ...notifications, bookingUpdates: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 font-heading">
                      Cancellation updates
                    </div>
                    <div className="text-xs text-slate-500">
                      Updates regarding booking cancellations and deposit refunds.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.cancellationUpdates}
                      onChange={(e) =>
                        setNotifications({ ...notifications, cancellationUpdates: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* GROUP 2: VISITS */}
            <div>
              <h3 className="text-sm font-bold font-heading text-slate-900 mb-1">
                Visits
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Reminders and updates for scheduled PG property tours.
              </p>

              <div className="divide-y divide-slate-100">
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 font-heading">
                      Visit confirmations
                    </div>
                    <div className="text-xs text-slate-500">
                      Confirmation when an in-person PG visit is scheduled.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.visitConfirmations}
                      onChange={(e) =>
                        setNotifications({ ...notifications, visitConfirmations: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 font-heading">
                      Visit reminders
                    </div>
                    <div className="text-xs text-slate-500">
                      Helpful reminder message before your scheduled PG tour.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.visitReminders}
                      onChange={(e) =>
                        setNotifications({ ...notifications, visitReminders: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 font-heading">
                      Visit changes
                    </div>
                    <div className="text-xs text-slate-500">
                      Notifications if a visit timing or host caretaker changes.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.visitChanges}
                      onChange={(e) =>
                        setNotifications({ ...notifications, visitChanges: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* GROUP 3: NESTIN */}
            <div>
              <h3 className="text-sm font-bold font-heading text-slate-900 mb-1">
                Nestin
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Recommendations and announcements from Nestin.
              </p>

              <div className="divide-y divide-slate-100">
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 font-heading">
                      Property recommendations
                    </div>
                    <div className="text-xs text-slate-500">
                      Curated PG matches based on your preferred city, locality, and budget.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.propertyRecommendations}
                      onChange={(e) =>
                        setNotifications({ ...notifications, propertyRecommendations: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 font-heading">
                      Offers and updates
                    </div>
                    <div className="text-xs text-slate-500">
                      Special move-in offers, rent discounts, and platform announcements.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.offersAndUpdates}
                      onChange={(e) =>
                        setNotifications({ ...notifications, offersAndUpdates: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-[#a3e635] shadow-xs transition-colors cursor-pointer font-heading"
              >
                Save preferences
              </button>
            </div>

          </div>
        </form>
      )}

      {/* 2. SEARCH PREFERENCES TAB */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSaveSearchPrefs} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* PREFERRED CITY */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Preferred City
                </label>
                <select
                  value={searchPrefs.city}
                  onChange={(e) => setSearchPrefs({ ...searchPrefs, city: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all font-sans"
                >
                  <option value="Bangalore">Bangalore</option>
                  <option value="Pune">Pune</option>
                  <option value="Delhi">Delhi NCR</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Gurgaon">Gurgaon</option>
                </select>
              </div>

              {/* PREFERRED AREA */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Preferred Area
                </label>
                <input
                  type="text"
                  value={searchPrefs.area}
                  onChange={(e) => setSearchPrefs({ ...searchPrefs, area: e.target.value })}
                  placeholder="e.g. Koramangala, Indiranagar, HSR"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all font-sans"
                />
              </div>

              {/* MONTHLY BUDGET */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Monthly Budget
                </label>
                <select
                  value={searchPrefs.budget}
                  onChange={(e) => setSearchPrefs({ ...searchPrefs, budget: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all font-sans"
                >
                  <option value="Under ₹8,000">Under ₹8,000</option>
                  <option value="₹8,000 - ₹12,000">₹8,000 - ₹12,000</option>
                  <option value="₹12,000 - ₹18,000">₹12,000 - ₹18,000</option>
                  <option value="₹18,000 - ₹25,000">₹18,000 - ₹25,000</option>
                  <option value="₹25,000+">₹25,000+</option>
                </select>
              </div>

              {/* ROOM TYPE */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Room Type
                </label>
                <select
                  value={searchPrefs.roomType}
                  onChange={(e) => setSearchPrefs({ ...searchPrefs, roomType: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all font-sans"
                >
                  <option value="Single Room">Single Room (Private)</option>
                  <option value="Double Sharing">Double Sharing (2 Sharing)</option>
                  <option value="Triple Sharing">Triple Sharing (3 Sharing)</option>
                  <option value="Single & Double Sharing">Any / Flexible</option>
                </select>
              </div>

              {/* MOVE-IN DATE */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Move-in Date
                </label>
                <select
                  value={searchPrefs.moveInDate}
                  onChange={(e) => setSearchPrefs({ ...searchPrefs, moveInDate: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all font-sans"
                >
                  <option value="Immediate">Immediately (Next 48 hours)</option>
                  <option value="Within 7 days">Within 7 days</option>
                  <option value="Within 15 days">Within 15 days</option>
                  <option value="Next Month">Next Month</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>
            </div>

            {/* OPTIONAL AMENITIES CHIPS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 font-heading mb-2">
                Preferred Amenities (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {['AC', 'Food', 'Furnished', 'Attached Bathroom', 'High-speed WiFi', 'Power Backup', 'Washing Machine'].map(
                  (amenity) => {
                    const isSelected = searchPrefs.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer font-heading ${
                          isSelected
                            ? 'bg-slate-900 text-[#a3e635] shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                        }`}
                      >
                        {amenity}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-[#a3e635] shadow-xs transition-colors cursor-pointer font-heading"
              >
                Save preferences
              </button>
            </div>

          </div>
        </form>
      )}

      {/* 3. SECURITY TAB */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          
          {/* GOOGLE ACCOUNT CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
            <h3 className="text-sm font-bold font-heading text-slate-900 mb-1">
              Google Account
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Your Nestin account is secured through Google.
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-2xs">
                  G
                </div>
                <div>
                  <div className="text-xs font-bold font-heading text-slate-900">
                    Signed in with Google
                  </div>
                  <div className="text-xs text-slate-500">
                    {user?.email || 'priya@gmail.com'}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#a3e635]/20 text-[#3d6800] border border-[#a3e635]/40 font-heading">
                Connected
              </span>
            </div>
          </div>

          {/* ACTIVE SESSIONS & RECENT LOGIN ACTIVITY */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900">
                  Active Sessions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recent login activity across your devices.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-heading text-slate-900 flex items-center gap-2">
                      <span>Chrome on macOS</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#a3e635]/30 text-[#2d5000]">
                        Active Now
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">Bangalore, India • Current session</div>
                  </div>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-heading text-slate-900">
                      Safari on iPhone
                    </div>
                    <div className="text-xs text-slate-500">Mumbai, India • 2 days ago</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => showToast('Signed out of other active sessions.')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 hover:text-slate-900 transition-colors cursor-pointer font-heading"
              >
                Sign out of all devices
              </button>
            </div>
          </div>

          {/* DELETE ACCOUNT (SUBTLE AT BOTTOM) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold font-heading text-rose-600">
                  Delete account
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Delete your Nestin account and personal information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer font-heading shrink-0"
              >
                Delete account
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 4. PRIVACY TAB */}
      {activeTab === 'privacy' && (
        <form onSubmit={handleSavePrivacy} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-6">
            
            <div className="divide-y divide-slate-100">
              <div className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-900 font-heading">
                    Personalized recommendations
                  </div>
                  <div className="text-xs text-slate-500">
                    Allow Nestin to suggest PGs and coliving spaces based on your browsing activity.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={privacySettings.personalizedRecommendations}
                    onChange={(e) =>
                      setPrivacySettings({
                        ...privacySettings,
                        personalizedRecommendations: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-900 font-heading">
                    Location-based recommendations
                  </div>
                  <div className="text-xs text-slate-500">
                    Use your approximate location to show nearby hostels and properties.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={privacySettings.locationRecommendations}
                    onChange={(e) =>
                      setPrivacySettings({
                        ...privacySettings,
                        locationRecommendations: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-900 font-heading">
                    Marketing communications
                  </div>
                  <div className="text-xs text-slate-500">
                    Receive promotional emails and WhatsApp updates about new PG listings.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={privacySettings.marketingCommunications}
                    onChange={(e) =>
                      setPrivacySettings({
                        ...privacySettings,
                        marketingCommunications: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
            </div>

            {/* PRIVACY POLICY & TERMS LINKS */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <a
                href="#privacy"
                onClick={(e) => { e.preventDefault(); showToast('Viewing Privacy Policy.'); }}
                className="hover:text-slate-900 underline flex items-center gap-1"
              >
                <span>Privacy Policy</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-300">•</span>
              <a
                href="#terms"
                onClick={(e) => { e.preventDefault(); showToast('Viewing Terms of Service.'); }}
                className="hover:text-slate-900 underline flex items-center gap-1"
              >
                <span>Terms of Service</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-[#a3e635] shadow-xs transition-colors cursor-pointer font-heading"
              >
                Save preferences
              </button>
            </div>

          </div>
        </form>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold font-heading text-slate-900">
                Delete your account?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This action cannot be undone. All your bookings, saved properties, and payment history will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer font-heading"
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantAccountLayout>
  );
};
