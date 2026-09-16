import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  Building,
  Upload,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth, UserProfile } from '../../context/AuthContext';

export const PersonalInformationSection: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dob: user?.dob || '1999-05-14',
    gender: user?.gender || 'Female',
    city: user?.city || 'Hyderabad',
    occupation: user?.occupation || 'Working Professional',
    collegeOrCompany: user?.collegeOrCompany || 'Cognizant Technology Solutions',
    bio: user?.bio || '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar || '');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Please upload a JPG, PNG, or WEBP image file.');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      updateUserProfile({ avatar: result });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview('');
    updateUserProfile({ avatar: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.phone.trim()) {
      errs.phone = 'Mobile number is required';
    } else if (!/^\+?[0-9\s-]{10,15}$/.test(formData.phone.trim())) {
      errs.phone = 'Enter a valid 10-digit mobile number';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    updateUserProfile({
      name: formData.name,
      phone: formData.phone,
      dob: formData.dob,
      gender: formData.gender as any,
      city: formData.city,
      occupation: formData.occupation as any,
      collegeOrCompany: formData.collegeOrCompany,
      bio: formData.bio,
      avatar: avatarPreview,
    });

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    }, 400);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-8 font-sans">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-black font-heading text-slate-900 tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-[#5fa000]" />
            <span>Personal Information</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Update your profile details, contact information, and tenant background.
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a3e635]/20 border border-[#a3e635]/50 text-[#3d6800] text-xs font-extrabold animate-fade-in font-heading">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Profile updated successfully</span>
          </div>
        )}
      </div>

      {/* PROFILE PHOTO UPLOAD & PREVIEW */}
      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/90 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="relative">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt={formData.name || 'User Profile'}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-[#a3e635] shadow-md"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-900 text-[#a3e635] flex items-center justify-center font-black text-2xl border-2 border-[#a3e635]/60 shadow-md font-heading">
              {getInitials(formData.name)}
            </div>
          )}
        </div>

        <div className="space-y-2 flex-1">
          <div className="font-extrabold text-sm text-slate-900 font-heading">
            Profile Photo
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md">
            Upload your photo for property owner verification. Accepted formats: JPG, PNG, WEBP (Max 5MB).
          </p>

          {photoError && (
            <div className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{photoError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
              id="profile-photo-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs font-heading"
            >
              <Upload className="w-3.5 h-3.5 text-[#a3e635]" />
              <span>{avatarPreview ? 'Change Photo' : 'Upload Photo'}</span>
            </button>

            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-heading"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FORM FIELDS */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Full Name <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ananya Rao"
              className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all ${
                errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              }`}
            />
            {errors.name && <p className="text-[11px] font-bold text-rose-500">{errors.name}</p>}
          </div>

          {/* Email Address (Read-only for Google Auth) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between font-heading">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Address</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase text-[#5fa000] bg-[#a3e635]/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Google Verified</span>
              </span>
            </label>
            <input
              type="email"
              value={formData.email}
              readOnly
              disabled
              className="w-full px-4 py-2.5 bg-slate-100/90 border border-slate-200 text-slate-500 rounded-xl text-xs sm:text-sm font-medium cursor-not-allowed select-none"
            />
            <p className="text-[11px] text-slate-400">
              Secured via Google Authentication. Email cannot be changed.
            </p>
          </div>

          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Mobile Number <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all ${
                errors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              }`}
            />
            {errors.phone && <p className="text-[11px] font-bold text-rose-500">{errors.phone}</p>}
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date of Birth</span>
            </label>
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all"
            />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 font-heading">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all"
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Current / Relocating City</span>
            </label>
            <select
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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

          {/* Occupation / Student Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>Occupation / Student Status</span>
            </label>
            <select
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value as any })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all"
            >
              <option value="Working Professional">Working Professional</option>
              <option value="Student">Student (College / University)</option>
              <option value="Job Seeker">Job Seeker / Fresher</option>
              <option value="Intern">Corporate Intern</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* College or Company */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>College or Company Name</span>
            </label>
            <input
              type="text"
              value={formData.collegeOrCompany}
              onChange={(e) => setFormData({ ...formData, collegeOrCompany: e.target.value })}
              placeholder="e.g. Cognizant / IIT Hyderabad"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all"
            />
          </div>

        </div>

        {/* Short Bio */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 font-heading">
            About You (Short Bio for Caretaker / Roommates)
          </label>
          <textarea
            rows={3}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us a little about your schedule, habits, or preferences..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:bg-white transition-all resize-none"
          />
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
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
