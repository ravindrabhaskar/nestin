import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!user) return null;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const handleItemClick = (path: string) => {
    navigate(path);
    onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 overflow-hidden font-sans ring-1 ring-black/5"
        >
          {/* USER INFO HEADER */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#0F5132] text-[#a3e635] flex items-center justify-center font-bold text-xs font-heading">
                {getInitials(user.name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-slate-900 truncate font-heading">{user.name}</div>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* MAIN ACCOUNT LINKS */}
          <div className="py-1.5 px-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => handleItemClick('/profile')}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-heading"
            >
              <Icon name="profile" size={16} className="text-slate-500" />
              <span>My Profile</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick('/my-bookings')}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-heading"
            >
              <Icon name="bookings" size={16} className="text-slate-500" />
              <span>My Bookings</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick('/saved')}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-heading"
            >
              <Icon name="heart" size={16} className="text-slate-500" />
              <span>Saved PGs</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick('/payments')}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-heading"
            >
              <Icon name="payments" size={16} className="text-slate-500" />
              <span>Payments</span>
            </button>
          </div>

          <div className="h-px bg-slate-100 mx-2 my-1" />

          {/* SECONDARY SETTINGS & SUPPORT */}
          <div className="py-1 px-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => handleItemClick('/settings/notifications')}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-heading"
            >
              <Icon name="settings" size={16} className="text-slate-500" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick('/support')}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-heading"
            >
              <Icon name="support" size={16} className="text-slate-500" />
              <span>Help & Support</span>
            </button>
          </div>

          <div className="h-px bg-slate-100 mx-2 my-1" />

          {/* LOGOUT */}
          <div className="p-1.5">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center gap-2.5 cursor-pointer font-heading"
            >
              <Icon name="logout" size={16} className="text-rose-500" />
              <span>Logout</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
