import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NestInLogo } from './NestInLogo';
import { Icon } from './ui/Icon';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useScrollLock } from '../hooks/useScrollLock';
import { scrollToTarget } from './SmoothScroll';
import { ProfileDropdown } from './profile/ProfileDropdown';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenListProperty?: () => void;
  onSelectSection: (sectionId: string) => void;
  onOpenFavorites?: () => void;
  currentPage?: 'home' | 'find-pg' | 'for-owners' | 'about' | 'contact';
  onNavigate?: (page: 'home' | 'find-pg' | 'for-owners' | 'about' | 'contact', sectionId?: string) => void;
}

const PUBLIC_NAV_LINKS = [
  { label: 'Home', href: 'home', page: 'home' as const, path: '/', iconName: 'home' },
  { label: 'Find PG', href: 'find-pg', page: 'find-pg' as const, path: '/find-pg', iconName: 'search' },
  { label: 'For Owners', href: 'for-owners', page: 'for-owners' as const, path: '/for-owners', iconName: 'building' },
  { label: 'Why Nestin', href: 'why-nestin', page: 'home' as const, path: '/', iconName: 'shieldCheck' },
  { label: 'FAQ', href: 'faq', page: 'home' as const, path: '/', iconName: 'help' },
  { label: 'About', href: 'about-us', page: 'about' as const, path: '/about', iconName: 'info' },
  { label: 'Contact', href: 'contact', page: 'contact' as const, path: '/contact', iconName: 'phone' },
];

const LOGGED_IN_NAV_LINKS = [
  { label: 'Find PG', href: 'find-pg', page: 'find-pg' as const, path: '/find-pg', iconName: 'search' },
  { label: 'Favorites', href: 'favorites', page: 'favorites' as const, path: '/favorites', iconName: 'heart' },
  { label: 'Wishlist', href: 'wishlist', page: 'wishlist' as const, path: '/my-wishlist', iconName: 'bookmark' },
];

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onSelectSection,
  onOpenFavorites,
  currentPage = 'home',
  onNavigate,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlistCount } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState('Find PG');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  useScrollLock(mobileMenuOpen);

  const isOwner = isAuthenticated && user?.role === 'owner';

  // For logged-in users, show strictly only 3 options: Find PG, Favorites, Wishlist
  const visibleNavLinks = isAuthenticated
    ? LOGGED_IN_NAV_LINKS
    : PUBLIC_NAV_LINKS.filter((link) => {
        if (link.label === 'For Owners' && isOwner) {
          return false;
        }
        return true;
      });

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  // Keep active link synced strictly to current URL pathname & scroll position
  useEffect(() => {
    if (location.pathname.startsWith('/find-pg')) {
      setActiveLink('Find PG');
    } else if (location.pathname.startsWith('/my-wishlist')) {
      setActiveLink('Wishlist');
    } else if (location.pathname.startsWith('/favorites')) {
      setActiveLink('Favorites');
    } else if (!isAuthenticated && (location.pathname.startsWith('/for-owners') || location.pathname.startsWith('/owner/dashboard'))) {
      setActiveLink('For Owners');
    } else if (!isAuthenticated && location.pathname.startsWith('/about')) {
      setActiveLink('About');
    } else if (!isAuthenticated && location.pathname.startsWith('/contact')) {
      setActiveLink('Contact');
    } else if (!isAuthenticated && location.pathname === '/') {
      const checkHomeScroll = () => {
        const faqEl = document.getElementById('faq');
        if (faqEl) {
          const rect = faqEl.getBoundingClientRect();
          if (rect.top <= 250 && rect.bottom >= 100) {
            setActiveLink('FAQ');
            return;
          }
        }
        const whyNestinEl = document.getElementById('why-nestin');
        if (whyNestinEl) {
          const rect = whyNestinEl.getBoundingClientRect();
          if (rect.top <= 250 && rect.bottom >= 100) {
            setActiveLink('Why Nestin');
            return;
          }
        }
        setActiveLink('Home');
      };
      checkHomeScroll();
    } else if (isAuthenticated) {
      if (location.pathname === '/') {
        setActiveLink('Find PG');
      }
    }
  }, [location.pathname, isAuthenticated]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Scroll listener for floating navbar background and home scroll-spy
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || window.pageYOffset;
      if (currentScrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (location.pathname === '/') {
        const faqEl = document.getElementById('faq');
        if (faqEl) {
          const rect = faqEl.getBoundingClientRect();
          if (rect.top <= 250 && rect.bottom >= 100) {
            setActiveLink('FAQ');
            return;
          }
        }
        const whyNestinEl = document.getElementById('why-nestin');
        if (whyNestinEl) {
          const rect = whyNestinEl.getBoundingClientRect();
          if (rect.top <= 250 && rect.bottom >= 100) {
            setActiveLink('Why Nestin');
            return;
          }
        }
        setActiveLink('Home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleNavClick = (link: (typeof PUBLIC_NAV_LINKS)[0]) => {
    setActiveLink(link.label);
    setMobileMenuOpen(false);

    if (link.label === 'Wishlist') {
      navigate('/my-wishlist');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (link.label === 'Favorites') {
      navigate('/favorites');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (link.label === 'For Owners') {
      if (isOwner) {
        navigate('/owner/dashboard');
        return;
      }
      navigate('/for-owners');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (link.label === 'About') {
      navigate('/about');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (link.label === 'Contact') {
      navigate('/contact');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (link.label === 'Find PG') {
      navigate('/find-pg');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (link.label === 'Home') {
      if (location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate('/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (link.label === 'Why Nestin' || link.label === 'FAQ') {
      if (location.pathname === '/') {
        scrollToTarget(link.href, { offset: 80 });
      } else {
        navigate(`/#${link.href}`);
        setTimeout(() => {
          scrollToTarget(link.href, { offset: 80 });
        }, 150);
      }
    }
  };

  return (
    <>
      {/* Top Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#a3e635] origin-left z-50 pointer-events-none"
        style={{ scaleX }}
      />

      <div className="fixed top-0 left-0 right-0 z-40 flex justify-center px-4 sm:px-6 pt-3 sm:pt-4 transition-all duration-300">
        <motion.header
          id="navbar-container"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`navbar-container w-full max-w-7xl rounded-[32px] ${
            isScrolled || mobileMenuOpen
              ? 'bg-white/95 backdrop-blur-xl shadow-nestin-floating border border-slate-200/80 py-2.5 px-4 sm:px-6'
              : 'bg-white/80 backdrop-blur-md shadow-nestin-md border border-slate-200/60 py-3 px-4 sm:px-6'
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer select-none"
              onClick={() => {
                navigate('/');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <NestInLogo variant="light" showTagline={false} />
            </motion.div>

            {/* Desktop Navigation Pills */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-800/10 backdrop-blur-md p-1 rounded-full border border-slate-300/40 shadow-2xs">
              {visibleNavLinks.map((link) => {
                const isActive = activeLink === link.label;
                return (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link)}
                    className={`relative px-4 py-1.5 text-xs lg:text-sm font-semibold transition-all duration-200 rounded-[24px] select-none cursor-pointer flex items-center gap-1.5 ${
                      isActive ? 'text-[#121820] font-bold' : 'text-slate-700 hover:text-black'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 bg-white shadow-xs rounded-[24px] -z-10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {isAuthenticated && (
                      <Icon
                        name={link.iconName}
                        size={14}
                        className={
                          link.label === 'Favorites' && wishlistCount > 0
                            ? 'text-rose-500 fill-rose-500'
                            : 'text-slate-600'
                        }
                      />
                    )}
                    <span>{link.label}</span>
                    {link.label === 'Favorites' && wishlistCount > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                        {wishlistCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              {!isAuthenticated && onOpenFavorites && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/my-wishlist');
                  }}
                  className="relative p-2.5 rounded-full text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 transition-colors flex items-center justify-center cursor-pointer group"
                  aria-label="My Favorites"
                  title="My Favorites"
                >
                  <Icon
                    name="heart"
                    size={20}
                    className={wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : 'group-hover:text-rose-500'}
                  />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                      {wishlistCount}
                    </span>
                  )}
                </button>
              )}

              {isAuthenticated ? (
                <div className="relative pl-1">
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 bg-[#0F5132] hover:bg-[#146c43] text-white pl-1.5 pr-3 py-1.5 rounded-full text-xs font-bold border border-emerald-800 shadow-xs cursor-pointer transition-all"
                    aria-expanded={profileDropdownOpen}
                    aria-label="User profile menu"
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover border border-[#a3e635]" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#a3e635] text-[#0F5132] flex items-center justify-center text-[10px] font-black font-heading">
                        {user?.name?.[0] || 'U'}
                      </div>
                    )}
                    <span className="truncate max-w-[100px] font-heading">{user?.name?.split(' ')[0] || 'User'}</span>
                    <Icon
                      name="chevronDown"
                      size={14}
                      className={`text-emerald-300 transition-transform ${profileDropdownOpen ? 'rotate-180 text-[#a3e635]' : ''}`}
                    />
                  </button>

                  {/* PROFILE DROPDOWN MENU */}
                  <ProfileDropdown
                    isOpen={profileDropdownOpen}
                    onClose={() => setProfileDropdownOpen(false)}
                  />
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onOpenAuth}
                  className="relative overflow-hidden group bg-[#a3e635] text-[#0F5132] font-extrabold text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-full shadow-[0_4px_16px_rgba(163,230,53,0.4)] hover:shadow-[0_6px_24px_rgba(163,230,53,0.6)] transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Log in</span>
                  <Icon name="arrowRight" size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </motion.button>
              )}
            </div>

            {/* Mobile Actions & Hamburger Menu Toggle */}
            <div className="flex md:hidden items-center gap-2">
              {!isAuthenticated && wishlistCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/my-wishlist');
                    setMobileMenuOpen(false);
                  }}
                  className="relative p-2 text-slate-700 hover:text-slate-950 bg-slate-100 rounded-full cursor-pointer transition-colors"
                  aria-label="My Wishlist"
                >
                  <Icon name="heart" size={16} className="fill-rose-500 text-rose-500" />
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center ring-2 ring-white">
                    {wishlistCount}
                  </span>
                </button>
              )}

              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="bg-[#a3e635] text-[#0F5132] font-black text-xs px-3.5 py-1.5 rounded-full shadow-xs hover:bg-[#92d428] transition-colors cursor-pointer"
                >
                  Log In
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    navigate(user?.role === 'owner' ? '/owner/dashboard' : user?.role === 'admin' ? '/admin' : '/my-profile');
                    setMobileMenuOpen(false);
                  }}
                  className="w-7 h-7 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[#a3e635] overflow-hidden"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.name?.[0] || 'U'}</span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 rounded-full cursor-pointer transition-colors flex items-center justify-center ${
                  mobileMenuOpen
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-800 hover:text-black bg-slate-100'
                }`}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <Icon name="close" size={20} /> : <Icon name="menu" size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer Menu Overlay */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="md:hidden overflow-hidden pt-4 mt-3 border-t border-slate-200/90"
              >
                {/* Navigation Links Group */}
                <div className="flex flex-col gap-1.5">
                  {visibleNavLinks.map((link) => {
                    const isActive = activeLink === link.label;
                    return (
                      <button
                        key={link.label}
                        type="button"
                        onClick={() => handleNavClick(link)}
                        className={`text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-[#a3e635] shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-xl ${isActive ? 'bg-slate-800 text-[#a3e635]' : 'bg-slate-100 text-slate-500'}`}>
                            <Icon name={link.iconName} size={16} />
                          </div>
                          <span>{link.label}</span>
                        </div>
                        {link.label === 'Favorites' && wishlistCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                            {wishlistCount}
                          </span>
                        ) : (
                          <Icon
                            name="chevronRight"
                            size={16}
                            className={isActive ? 'text-[#a3e635]' : 'text-slate-400'}
                          />
                        )}
                      </button>
                    );
                  })}

                  {!isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/my-wishlist');
                        setMobileMenuOpen(false);
                      }}
                      className="text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-xl bg-rose-50 text-rose-500">
                          <Icon name="heart" size={16} />
                        </div>
                        <span>Saved Favorites</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                        {wishlistCount} saved
                      </span>
                    </button>
                  )}

                  {/* Authenticated User Status or Login Prompt */}
                  {isAuthenticated ? (
                    <div className="mt-3 pt-3 border-t border-slate-200/90 space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center gap-2.5">
                          {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-[#a3e635]" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#a3e635] text-[#0F5132] font-black flex items-center justify-center text-xs font-heading">
                              {user?.name?.[0] || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-extrabold text-slate-900 truncate max-w-[150px] font-heading">{user?.name}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{user?.email}</div>
                          </div>
                        </div>
                        <span className="text-[9px] font-extrabold uppercase bg-[#0F5132] text-[#a3e635] px-2 py-0.5 rounded-full font-heading">
                          {user?.role === 'owner' ? 'Owner' : user?.role === 'admin' ? 'Admin' : 'Resident'}
                        </span>
                      </div>

                      {/* Mobile Profile Navigation Links */}
                      <div className="grid grid-cols-2 gap-1.5 text-xs font-heading font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            navigate('/profile');
                            setMobileMenuOpen(false);
                          }}
                          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <Icon name="profile" size={14} className="text-slate-500" />
                          <span>My Profile</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigate('/my-bookings');
                            setMobileMenuOpen(false);
                          }}
                          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <Icon name="bookings" size={14} className="text-slate-500" />
                          <span>My Bookings</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigate('/saved');
                            setMobileMenuOpen(false);
                          }}
                          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <Icon name="heart" size={14} className="text-slate-500" />
                          <span>Saved PGs</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigate('/payments');
                            setMobileMenuOpen(false);
                          }}
                          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <Icon name="payments" size={14} className="text-slate-500" />
                          <span>Payments</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigate('/settings/notifications');
                            setMobileMenuOpen(false);
                          }}
                          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <Icon name="settings" size={14} className="text-slate-500" />
                          <span>Settings</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigate('/support');
                            setMobileMenuOpen(false);
                          }}
                          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <Icon name="support" size={14} className="text-slate-500" />
                          <span>Help & Support</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setMobileMenuOpen(false);
                          }}
                          className="col-span-2 p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Icon name="logout" size={14} className="text-rose-600" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-slate-200/90">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenAuth();
                        }}
                        className="w-full py-3 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Icon name="profile" size={16} />
                        <span>Sign In / Create Free Account</span>
                        <Icon name="arrowRight" size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>
      </div>
    </>
  );
};
