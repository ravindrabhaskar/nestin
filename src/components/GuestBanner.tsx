import React from 'react';

interface GuestBannerProps {
  onCreateAccount: () => void;
}

export const GuestBanner: React.FC<GuestBannerProps> = React.memo(({ onCreateAccount }) => {
  return (
    <div className="bg-white rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 my-3">
      <div className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed">
        You're browsing as a guest — explore everything freely. Create a free Nestin account to schedule visits, save stays and connect with owners.
      </div>

      <button
        type="button"
        onClick={onCreateAccount}
        className="px-6 py-3 rounded-full bg-[#a3e635] hover:bg-[#92d428] text-[#0F5132] font-bold text-xs sm:text-sm shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 self-stretch sm:self-auto text-center font-heading"
      >
        Create free account
      </button>
    </div>
  );
});

GuestBanner.displayName = 'GuestBanner';

