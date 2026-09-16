import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Mail,
  Smartphone,
  MessageSquare,
  Calendar,
  CreditCard,
  Building,
  Tag,
  Eye,
  Sparkles,
} from 'lucide-react';
import { useAuth, DEFAULT_NOTIFICATION_SETTINGS } from '../../context/AuthContext';
import { UserNotificationSettings } from '../../types';

export const NotificationSettingsSection: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const initialSettings: UserNotificationSettings = user?.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;
  const [settings, setSettings] = useState<UserNotificationSettings>(initialSettings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleSetting = (key: keyof UserNotificationSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    updateUserProfile({ notificationSettings: updated });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: () => void;
    title: string;
    description?: string;
  }> = ({ checked, onChange, title, description }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="space-y-0.5">
        <div className="text-xs font-bold text-slate-800 font-heading">{title}</div>
        {description && <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-slate-900' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5 bg-[#a3e635]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-black font-heading text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#5fa000]" />
            <span>Notification Preferences</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose what alerts, rent reminders, and property updates you wish to receive.
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a3e635]/20 border border-[#a3e635]/50 text-[#3d6800] text-xs font-extrabold animate-fade-in font-heading">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Notification preferences updated</span>
          </div>
        )}
      </div>

      {/* NOTIFICATION CHANNELS */}
      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
        <div className="text-xs font-black uppercase tracking-wider text-slate-400 font-heading">
          DELIVERY CHANNELS
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => toggleSetting('emailNotifications')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              settings.emailNotifications
                ? 'bg-white border-slate-900 shadow-xs'
                : 'bg-white/60 border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Mail className={`w-4 h-4 ${settings.emailNotifications ? 'text-slate-900' : 'text-slate-400'}`} />
              <span className="text-xs font-bold font-heading">Email</span>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
              settings.emailNotifications ? 'bg-slate-900 text-[#a3e635]' : 'bg-slate-200 text-slate-500'
            }`}>
              {settings.emailNotifications ? 'Active' : 'Off'}
            </span>
          </div>

          <div
            onClick={() => toggleSetting('pushNotifications')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              settings.pushNotifications
                ? 'bg-white border-slate-900 shadow-xs'
                : 'bg-white/60 border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className={`w-4 h-4 ${settings.pushNotifications ? 'text-slate-900' : 'text-slate-400'}`} />
              <span className="text-xs font-bold font-heading">Push Alerts</span>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
              settings.pushNotifications ? 'bg-slate-900 text-[#a3e635]' : 'bg-slate-200 text-slate-500'
            }`}>
              {settings.pushNotifications ? 'Active' : 'Off'}
            </span>
          </div>

          <div
            onClick={() => toggleSetting('whatsAppNotifications')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              settings.whatsAppNotifications
                ? 'bg-white border-slate-900 shadow-xs'
                : 'bg-white/60 border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className={`w-4 h-4 ${settings.whatsAppNotifications ? 'text-[#25D366]' : 'text-slate-400'}`} />
              <span className="text-xs font-bold font-heading">WhatsApp</span>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
              settings.whatsAppNotifications ? 'bg-[#25D366]/20 text-[#128C7E]' : 'bg-slate-200 text-slate-500'
            }`}>
              {settings.whatsAppNotifications ? 'Active' : 'Off'}
            </span>
          </div>
        </div>
      </div>

      {/* 1. BOOKING NOTIFICATIONS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 font-heading">
          <Calendar className="w-4 h-4 text-[#5fa000]" />
          <span>Booking Notifications</span>
        </div>
        <div className="bg-slate-50/70 rounded-2xl border border-slate-100 px-4 py-2 divide-y divide-slate-100">
          <ToggleSwitch
            checked={settings.bookingConfirmed}
            onChange={() => toggleSetting('bookingConfirmed')}
            title="Booking Confirmed"
            description="Receive immediate confirmation receipts and room allotment details."
          />
          <ToggleSwitch
            checked={settings.bookingCancelled}
            onChange={() => toggleSetting('bookingCancelled')}
            title="Booking Cancelled"
            description="Alerts if a booking is cancelled or modified by either party."
          />
          <ToggleSwitch
            checked={settings.bookingUpdates}
            onChange={() => toggleSetting('bookingUpdates')}
            title="Booking Request Updates"
            description="Status changes on pending room reservations and owner reviews."
          />
        </div>
      </div>

      {/* 2. PAYMENT NOTIFICATIONS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 font-heading">
          <CreditCard className="w-4 h-4 text-[#5fa000]" />
          <span>Payment Notifications</span>
        </div>
        <div className="bg-slate-50/70 rounded-2xl border border-slate-100 px-4 py-2 divide-y divide-slate-100">
          <ToggleSwitch
            checked={settings.paymentConfirmation}
            onChange={() => toggleSetting('paymentConfirmation')}
            title="Payment Confirmation"
            description="Instant transaction receipts and monthly rent acknowledgments."
          />
          <ToggleSwitch
            checked={settings.paymentReminders}
            onChange={() => toggleSetting('paymentReminders')}
            title="Payment Reminders"
            description="Gentle due date reminders 3 days before monthly rent is due."
          />
          <ToggleSwitch
            checked={settings.refundUpdates}
            onChange={() => toggleSetting('refundUpdates')}
            title="Refund Updates"
            description="Status alerts regarding security deposit settlements and token refunds."
          />
        </div>
      </div>

      {/* 3. VISIT NOTIFICATIONS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 font-heading">
          <Eye className="w-4 h-4 text-[#5fa000]" />
          <span>Visit Notifications</span>
        </div>
        <div className="bg-slate-50/70 rounded-2xl border border-slate-100 px-4 py-2 divide-y divide-slate-100">
          <ToggleSwitch
            checked={settings.visitConfirmation}
            onChange={() => toggleSetting('visitConfirmation')}
            title="Visit Confirmation"
            description="Confirmation when property manager approves your requested PG walkthrough."
          />
          <ToggleSwitch
            checked={settings.visitReminder}
            onChange={() => toggleSetting('visitReminder')}
            title="Visit Reminder"
            description="Helpful notification with caretaker contact & map directions on visit day."
          />
          <ToggleSwitch
            checked={settings.visitCancellation}
            onChange={() => toggleSetting('visitCancellation')}
            title="Visit Cancellation & Reschedules"
            description="Instant updates if scheduled visit timing needs adjustment."
          />
        </div>
      </div>

      {/* 4. PROPERTY & WISHLIST NOTIFICATIONS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 font-heading">
          <Building className="w-4 h-4 text-[#5fa000]" />
          <span>Property & Recommendations</span>
        </div>
        <div className="bg-slate-50/70 rounded-2xl border border-slate-100 px-4 py-2 divide-y divide-slate-100">
          <ToggleSwitch
            checked={settings.newPgRecommendations}
            onChange={() => toggleSetting('newPgRecommendations')}
            title="New PG Recommendations"
            description="Curated listings matching your city and budget preferences."
          />
          <ToggleSwitch
            checked={settings.savedPgUpdates}
            onChange={() => toggleSetting('savedPgUpdates')}
            title="Saved PG Updates"
            description="Alerts whenever a PG in your wishlist adds new rooms or offers."
          />
          <ToggleSwitch
            checked={settings.priceChanges}
            onChange={() => toggleSetting('priceChanges')}
            title="Price Drop Alerts"
            description="Notifications if prices decrease on properties you have viewed or saved."
          />
          <ToggleSwitch
            checked={settings.availabilityAlerts}
            onChange={() => toggleSetting('availabilityAlerts')}
            title="Availability & Vacancy Alerts"
            description="Get notified immediately when a previously sold-out PG has an open bed."
          />
        </div>
      </div>

      {/* 5. MARKETING & OFFERS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 font-heading">
          <Tag className="w-4 h-4 text-[#5fa000]" />
          <span>Marketing & Offers</span>
        </div>
        <div className="bg-slate-50/70 rounded-2xl border border-slate-100 px-4 py-2 divide-y divide-slate-100">
          <ToggleSwitch
            checked={settings.offers}
            onChange={() => toggleSetting('offers')}
            title="Exclusive Student & Techie Discounts"
            description="Early bird discounts, referral cashbacks, and seasonal offers."
          />
          <ToggleSwitch
            checked={settings.promotions}
            onChange={() => toggleSetting('promotions')}
            title="Promotions & Partner Deals"
            description="Offers from laundry, meal subscription, and packing partners."
          />
          <ToggleSwitch
            checked={settings.nestinUpdates}
            onChange={() => toggleSetting('nestinUpdates')}
            title="Nestin Product Updates"
            description="News on new cities, features, and platform enhancements."
          />
        </div>
      </div>

    </div>
  );
};
