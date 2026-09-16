import React, { useState, useRef } from 'react';
import { Camera, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TenantAccountLayout } from '../components/profile/TenantAccountLayout';
import { uploadFile } from '../lib/apiClient';

export const TenantProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Split name into first and last name
  const nameParts = (user?.name || '').trim().split(' ');
  const initialFirst = nameParts[0] || '';
  const initialLast = nameParts.slice(1).join(' ') || '';

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [city, setCity] = useState(user?.city || 'Bangalore');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const handleCancel = () => {
    const parts = (user?.name || '').trim().split(' ');
    setFirstName(parts[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
    setPhone(user?.phone || '+91 98765 43210');
    setCity(user?.city || 'Bangalore');
    setAvatar(user?.avatar || '');
    setIsEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (updateUser) {
      updateUser({
        name: fullName || user?.name || 'Nestin User',
        phone,
        city,
        avatar,
      });
    }
    setIsEditing(false);
    showToast('Changes saved successfully.');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await uploadFile(file, 'avatar');
      setAvatar(uploaded.url);
      if (!isEditing && updateUser) {
        await updateUser({ avatar: uploaded.url });
        showToast('Profile photo updated.');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not upload the photo.');
    }
  };

  const handleRemovePhoto = () => {
    setAvatar('');
    if (!isEditing && updateUser) {
      updateUser({ avatar: '' });
      showToast('Profile photo removed.');
    }
  };

  return (
    <TenantAccountLayout
      title="My Profile"
      subtitle="Manage your personal information and account details."
      activeNav="/profile"
    >
      {/* SUCCESS TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-[#a3e635] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold font-heading border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-[#a3e635]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        
        {/* PROFILE HEADER CARD */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                {avatar || user?.avatar ? (
                  <img
                    src={avatar || user?.avatar}
                    alt={user?.name}
                    className="w-16 h-16 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-900 text-[#a3e635] flex items-center justify-center font-bold text-lg font-heading">
                    {getInitials(user?.name)}
                  </div>
                )}

                {isEditing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Change photo"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-bold font-heading text-slate-900 truncate">
                  {user?.name || 'Priya Sharma'}
                </h2>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email || 'priya@gmail.com'}</p>

                {isEditing && (
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-950 underline cursor-pointer"
                    >
                      Change photo
                    </button>
                    {(avatar || user?.avatar) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {!isEditing && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200/90 shadow-2xs transition-colors cursor-pointer font-heading"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PERSONAL INFORMATION FORM */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
          <div className="mb-6">
            <h3 className="text-base font-bold font-heading text-slate-900">
              Personal information
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your personal details.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              
              {/* FIRST NAME */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="First name"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all font-sans"
                  />
                ) : (
                  <div className="h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center text-xs font-medium text-slate-900 font-sans">
                    {firstName || 'Priya'}
                  </div>
                )}
              </div>

              {/* LAST NAME */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all font-sans"
                  />
                ) : (
                  <div className="h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center text-xs font-medium text-slate-900 font-sans">
                    {lastName || 'Sharma'}
                  </div>
                )}
              </div>

              {/* EMAIL ADDRESS (READ-ONLY) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Email Address
                </label>
                <div className="h-10 px-3.5 rounded-xl bg-slate-100/70 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600 font-sans">
                  <span className="truncate">{user?.email || 'priya@gmail.com'}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading">
                    Google
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Managed securely through your Google account.</p>
              </div>

              {/* PHONE NUMBER */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all font-sans"
                  />
                ) : (
                  <div className="h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center text-xs font-medium text-slate-900 font-sans">
                    {phone}
                  </div>
                )}
              </div>

              {/* CITY */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  City
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bangalore"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all font-sans"
                  />
                ) : (
                  <div className="h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center text-xs font-medium text-slate-900 font-sans">
                    {city}
                  </div>
                )}
              </div>

            </div>

            {/* FORM ACTION BUTTONS */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer font-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-[#a3e635] shadow-xs transition-colors cursor-pointer font-heading"
                >
                  Save changes
                </button>
              </div>
            )}
          </form>
        </div>

      </div>
    </TenantAccountLayout>
  );
};
