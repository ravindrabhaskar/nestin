import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon';

interface TenantAccountLayoutProps {
  title: string;
  subtitle: string;
  activeNav?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const TenantAccountLayout: React.FC<TenantAccountLayoutProps> = ({
  title,
  subtitle,
  activeNav,
  children,
  headerAction,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || '';

  const isNavActive = (path: string, tab?: string) => {
    if (activeNav) {
      if (tab) return activeNav === `${path}?tab=${tab}` || (currentPath === path && currentTab === tab);
      return activeNav === path;
    }
    if (tab) {
      return (currentPath === path && currentTab === tab) || (currentPath === `${path}/${tab}`);
    }
    if (path.startsWith('/settings/')) {
      return currentPath === path || (currentPath === '/settings' && currentTab === path.replace('/settings/', ''));
    }
    if (path === '/settings' && !currentTab) {
      return currentPath === '/settings' || currentPath.startsWith('/settings/');
    }
    return currentPath === path;
  };

  const navItems = [
    {
      group: 'ACCOUNT',
      links: [
        { label: 'Profile', path: '/profile', iconName: 'profile' },
        { label: 'Bookings', path: '/my-bookings', iconName: 'bookings' },
        { label: 'Saved PGs', path: '/saved', iconName: 'heart' },
        { label: 'Payments', path: '/payments', iconName: 'payments' },
      ],
    },
    {
      group: 'PREFERENCES',
      links: [
        { label: 'Notifications', path: '/settings/notifications', tab: 'notifications', iconName: 'notifications' },
        { label: 'Search Preferences', path: '/settings/preferences', tab: 'preferences', iconName: 'filter' },
      ],
    },
    {
      group: 'SETTINGS',
      links: [
        { label: 'Security', path: '/settings/security', tab: 'security', iconName: 'lock' },
        { label: 'Privacy', path: '/settings/privacy', tab: 'privacy', iconName: 'shield' },
      ],
    },
    {
      group: 'SUPPORT',
      links: [
        { label: 'Help & Support', path: '/support', iconName: 'support' },
      ],
    },
  ];

  const handleNavClick = (path: string, tab?: string) => {
    if (tab) {
      navigate(`/settings/${tab}`);
    } else {
      navigate(path);
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 pt-24 sm:pt-28 pb-20 font-sans selection:bg-[#a3e635] selection:text-black">
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-200/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {subtitle}
            </p>
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>

        {/* Mobile Navigation Dropdown Toggle */}
        <div className="lg:hidden mb-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs font-bold text-slate-800"
          >
            <span>Navigation Menu</span>
            <Icon
              name="chevronDown"
              size={16}
              className={`text-slate-500 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {mobileMenuOpen && (
            <div className="mt-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-lg space-y-4">
              {navItems.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <div className="px-2 text-[10px] font-black uppercase text-slate-400 font-heading tracking-wider">
                    {group.group}
                  </div>
                  <div className="space-y-0.5">
                    {group.links.map((link) => {
                      const active = isNavActive(link.path, link.tab);
                      return (
                        <button
                          key={link.label}
                          type="button"
                          onClick={() => handleNavClick(link.path, link.tab)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-left ${
                            active
                              ? 'bg-slate-900 text-[#a3e635]'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon name={link.iconName} size={16} className={active ? 'text-[#a3e635]' : 'text-slate-400'} />
                          <span>{link.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs space-y-5 sticky top-28">
            {navItems.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 text-[10px] font-black uppercase text-slate-400/90 font-heading tracking-wider">
                  {group.group}
                </div>
                <div className="space-y-0.5">
                  {group.links.map((link) => {
                    const active = isNavActive(link.path, link.tab);
                    return (
                      <button
                        key={link.label}
                        type="button"
                        onClick={() => handleNavClick(link.path, link.tab)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-[#a3e635] shadow-xs'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                        }`}
                      >
                        <Icon
                          name={link.iconName}
                          size={16}
                          className={active ? 'text-[#a3e635]' : 'text-slate-400'}
                        />
                        <span>{link.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* Right Main Content Area */}
          <main className="lg:col-span-9 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
};
