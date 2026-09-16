import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { 
  User, 
  Calendar, 
  Heart, 
  MapPin, 
  ShieldCheck, 
  LogOut, 
  Sparkles, 
  ChevronRight, 
  Clock, 
  Building, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Search,
  Bell,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { NestInLogo } from '../components/NestInLogo';

interface UserDashboardPageProps {
  activeTab?: 'overview' | 'bookings' | 'wishlist' | 'profile';
}

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ activeTab = 'overview' }) => {
  const { user, logout } = useAuth();
  const { wishlist, wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<'overview' | 'bookings' | 'wishlist' | 'profile'>(activeTab);
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);

  React.useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const mockBookings = [
    {
      id: 'bk-101',
      propertyName: 'Zolo Stays Premium Coliving',
      location: 'Kukatpally, Hyderabad',
      moveInDate: '15 Aug 2026',
      roomType: 'Single Private Room',
      rent: '₹12,500/mo',
      deposit: '₹25,000',
      status: 'Confirmed',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'bk-102',
      propertyName: 'Isthara Tech Park Residency',
      location: 'Gachibowli, Hyderabad',
      moveInDate: '01 Sep 2026',
      roomType: 'Double Sharing AC',
      rent: '₹8,500/mo',
      deposit: '₹17,000',
      status: 'Pending Verification',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80',
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#121820] font-sans pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* NAVIGATION TABS - Desktop Row + Mobile Hamburger Menu */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-2xs">
          {/* Mobile Hamburger Header (md:hidden) */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileTabsOpen(!mobileTabsOpen)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white font-extrabold text-xs font-heading cursor-pointer shadow-xs"
              aria-expanded={mobileTabsOpen}
              aria-label="Toggle dashboard sections"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[#a3e635]">
                  {currentTab === 'overview' && <Sparkles className="w-4 h-4" />}
                  {currentTab === 'bookings' && <Calendar className="w-4 h-4" />}
                  {currentTab === 'wishlist' && <Heart className="w-4 h-4" />}
                  {currentTab === 'profile' && <User className="w-4 h-4" />}
                </span>
                <span className="capitalize">
                  {currentTab === 'overview' && 'Dashboard Overview'}
                  {currentTab === 'bookings' && `My Bookings (${mockBookings.length})`}
                  {currentTab === 'wishlist' && `Saved Wishlist (${wishlistCount})`}
                  {currentTab === 'profile' && 'Account Profile'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Menu</span>
                <div className="p-1 rounded-lg bg-slate-800 text-[#a3e635]">
                  {mobileTabsOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {/* Mobile Expanded Menu Drawer */}
            {mobileTabsOpen && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5 animate-fadeIn">
                {[
                  { id: 'overview', label: 'Dashboard Overview', icon: Sparkles },
                  { id: 'bookings', label: 'My Bookings', icon: Calendar, badge: mockBookings.length },
                  { id: 'wishlist', label: 'Saved Wishlist', icon: Heart, badge: wishlistCount },
                  { id: 'profile', label: 'Account Profile', icon: User },
                ].map((tabItem) => {
                  const Icon = tabItem.icon;
                  const isActive = currentTab === tabItem.id;
                  return (
                    <button
                      key={tabItem.id}
                      type="button"
                      onClick={() => {
                        setCurrentTab(tabItem.id as any);
                        setMobileTabsOpen(false);
                        if (tabItem.id === 'wishlist') navigate('/my-wishlist');
                        else if (tabItem.id === 'profile') navigate('/my-profile');
                        else if (tabItem.id === 'bookings') navigate('/my-bookings');
                        else if (tabItem.id === 'overview') navigate('/dashboard');
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold font-heading flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 border border-slate-200'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                        <span>{tabItem.label}</span>
                      </div>
                      {tabItem.badge !== undefined && tabItem.badge > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#a3e635] text-slate-950">
                          {tabItem.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop Row of Tabs (hidden md:flex) */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { id: 'overview', label: 'Dashboard Overview', icon: Sparkles },
              { id: 'bookings', label: 'My Bookings', icon: Calendar, badge: mockBookings.length },
              { id: 'wishlist', label: 'Saved Wishlist', icon: Heart, badge: wishlistCount },
              { id: 'profile', label: 'Account Profile', icon: User },
            ].map((tabItem) => {
              const Icon = tabItem.icon;
              const isActive = currentTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  onClick={() => {
                    setCurrentTab(tabItem.id as any);
                    if (tabItem.id === 'wishlist') navigate('/my-wishlist');
                    else if (tabItem.id === 'profile') navigate('/my-profile');
                    else if (tabItem.id === 'bookings') navigate('/my-bookings');
                    else if (tabItem.id === 'overview') navigate('/dashboard');
                  }}
                  className={`py-3 px-5 rounded-xl text-xs font-extrabold font-heading flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-[#a3e635] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tabItem.label}</span>
                  {tabItem.badge !== undefined && tabItem.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-[#a3e635] text-slate-950' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tabItem.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB CONTENTS */}
        {currentTab === 'overview' && (
          <div className="space-y-8">
            {/* STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                    Active Bookings
                  </p>
                  <p className="text-2xl font-black text-slate-900 font-heading mt-1">
                    {mockBookings.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                    Saved Stays
                  </p>
                  <p className="text-2xl font-black text-slate-900 font-heading mt-1">
                    {wishlistCount}
                  </p>
                </div>
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                  <Heart className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                    Account Status
                  </p>
                  <p className="text-2xl font-black text-emerald-600 font-heading mt-1 flex items-center gap-1.5">
                    Verified
                  </p>
                </div>
                <div className="w-12 h-12 bg-slate-900 text-[#a3e635] rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* RECENT BOOKINGS PREVIEW */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold font-heading text-slate-900">
                    My Active Bookings
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your scheduled move-ins and stay agreements
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('bookings')}
                  className="text-xs font-bold text-slate-900 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {mockBookings.map((bk) => (
                  <div key={bk.id} className="border border-slate-200 rounded-2xl p-4 flex gap-4 hover:border-slate-300 transition-all bg-stone-50/40">
                    <img src={bk.image} alt={bk.propertyName} className="w-24 h-24 rounded-xl object-cover shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md font-heading">
                        {bk.status}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{bk.propertyName}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{bk.location}</span>
                      </p>
                      <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-200/80 mt-2">
                        <span className="text-slate-500">Move-in: <strong className="text-slate-800">{bk.moveInDate}</strong></span>
                        <span className="font-extrabold text-slate-900">{bk.rent}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'bookings' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-6">
            <h3 className="text-xl font-extrabold font-heading text-slate-900">
              All Booking History
            </h3>
            <div className="space-y-4">
              {mockBookings.map((bk) => (
                <div key={bk.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 bg-stone-50/30">
                  <div className="flex gap-4 items-center">
                    <img src={bk.image} alt={bk.propertyName} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                          {bk.status}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">ID: {bk.id}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-1">{bk.propertyName}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{bk.location}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                    <div>Move-In Date: <strong className="text-slate-900">{bk.moveInDate}</strong></div>
                    <div>Room Type: <strong className="text-slate-900">{bk.roomType}</strong></div>
                    <div className="text-base font-extrabold text-slate-900">{bk.rent}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTab === 'wishlist' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-6">
            <h3 className="text-xl font-extrabold font-heading text-slate-900">
              Saved Stays ({wishlistCount})
            </h3>

            {wishlist.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Heart className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-slate-600 font-semibold text-sm">Your wishlist is currently empty.</p>
                <button
                  type="button"
                  onClick={() => navigate('/find-pg')}
                  className="py-2.5 px-5 bg-slate-900 text-[#a3e635] font-extrabold text-xs rounded-xl hover:bg-slate-800 transition-all"
                >
                  Explore Top Rated PGs
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((prop) => (
                  <div key={prop.id} className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-stone-50/30">
                    <img src={prop.image || prop.images?.[0]} alt={prop.title || prop.name} className="w-full h-40 rounded-xl object-cover" />
                    <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{prop.title || prop.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{prop.location || prop.city}</span>
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="font-extrabold text-slate-900 text-sm">₹{prop.rent || prop.price}/mo</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/properties/${prop.id}`)}
                        className="py-1.5 px-3 bg-slate-900 text-[#a3e635] text-xs font-bold rounded-lg"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'profile' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-6 max-w-2xl">
            <h3 className="text-xl font-extrabold font-heading text-slate-900">
              Personal Profile Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  readOnly
                  value={user?.name || ''}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  readOnly
                  value={user?.email || ''}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Mobile Phone</label>
                <input
                  type="text"
                  readOnly
                  value={user?.phone || '+91 98765 43210'}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Role Type</label>
                <input
                  type="text"
                  readOnly
                  value={user?.role === 'owner' ? 'Property Owner / Landlord' : 'Tenant / Working Professional'}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
