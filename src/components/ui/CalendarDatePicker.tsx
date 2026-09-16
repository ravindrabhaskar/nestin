import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight, Check, Sparkles, Clock, CalendarDays, X } from 'lucide-react';

export interface CalendarDatePickerProps {
  id?: string;
  label?: string;
  value: string; // Format: 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  minDate?: string; // Format: 'YYYY-MM-DD', defaults to today
  maxDate?: string; // Format: 'YYYY-MM-DD'
  mode?: 'popover' | 'inline';
  placeholder?: string;
  helperText?: string;
  inquiryType?: 'viewing' | 'booking' | 'call' | 'general';
  quickPresets?: boolean;
  required?: boolean;
  className?: string;
}

// Zero-dependency date math helpers
function formatIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(isoStr: string): Date {
  if (!isoStr) return new Date();
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  id = 'calendar-date-picker',
  label,
  value,
  onChange,
  minDate,
  maxDate,
  mode = 'popover',
  placeholder = 'Select preferred date',
  helperText,
  inquiryType = 'viewing',
  quickPresets = true,
  required = false,
  className = '',
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = formatIso(today);

  const effectiveMin = minDate || todayIso;
  const effectiveMinDate = parseIso(effectiveMin);
  effectiveMinDate.setHours(0, 0, 0, 0);

  const selectedDateObj = value ? parseIso(value) : null;

  // View state for the calendar month
  const [viewYear, setViewYear] = useState<number>(
    selectedDateObj ? selectedDateObj.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    selectedDateObj ? selectedDateObj.getMonth() : today.getMonth()
  );

  const [isOpen, setIsOpen] = useState(mode === 'inline');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync calendar view month when value changes from outside
  useEffect(() => {
    if (value) {
      const parsed = parseIso(value);
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]);

  // Click outside to close popover
  useEffect(() => {
    if (mode === 'inline') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, mode]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleJumpToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onChange(todayIso);
    if (mode === 'popover') setIsOpen(false);
  };

  // Check if prev month is fully before minDate
  const canGoPrev = (() => {
    const firstOfCurrentView = new Date(viewYear, viewMonth, 1);
    const lastOfPrevView = new Date(viewYear, viewMonth, 0);
    return lastOfPrevView >= effectiveMinDate;
  })();

  // Days in month calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Presets
  const getPresets = () => {
    const presets: { label: string; dateStr: string; hint?: string }[] = [];

    // Today
    presets.push({ label: 'Today', dateStr: todayIso, hint: 'Immediate walkthrough' });

    // Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    presets.push({ label: 'Tomorrow', dateStr: formatIso(tomorrow), hint: 'Next day slot' });

    // This Weekend (Upcoming Saturday)
    const thisSat = new Date(today);
    const dayOfWeek = thisSat.getDay();
    const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
    thisSat.setDate(thisSat.getDate() + daysUntilSat);
    presets.push({ label: 'This Saturday', dateStr: formatIso(thisSat), hint: 'Weekend viewing' });

    // Next Monday
    const nextMon = new Date(today);
    const daysUntilMon = ((8 - dayOfWeek) % 7) || 7;
    nextMon.setDate(nextMon.getDate() + daysUntilMon);
    presets.push({ label: 'Next Monday', dateStr: formatIso(nextMon), hint: 'Week start' });

    // 1st of Next Month (Crucial for move-ins!)
    const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    presets.push({
      label: `1st ${MONTH_NAMES[nextMonthFirst.getMonth()].slice(0, 3)}`,
      dateStr: formatIso(nextMonthFirst),
      hint: 'New cycle move-in',
    });

    return presets;
  };

  const handleSelectDate = (d: number) => {
    const dateObj = new Date(viewYear, viewMonth, d);
    const iso = formatIso(dateObj);
    onChange(iso);
    if (mode === 'popover') {
      setIsOpen(false);
    }
  };

  // Formatted human readable display string
  const formatHumanDisplay = (isoStr: string) => {
    if (!isoStr) return '';
    const d = parseIso(isoStr);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    const mName = MONTH_NAMES[d.getMonth()].slice(0, 3);
    return `${dayName}, ${d.getDate()} ${mName} ${d.getFullYear()}`;
  };

  const getRelativeBadge = (isoStr: string) => {
    if (!isoStr) return null;
    const d = parseIso(isoStr);
    d.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0) return 'Past date';
    return null;
  };

  const relativeBadge = value ? getRelativeBadge(value) : null;

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={containerRef} id={`${id}-container`}>
      {label && (
        <label
          htmlFor={id}
          className="flex items-center justify-between text-xs font-black text-slate-700 font-heading"
        >
          <span>
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
          {inquiryType === 'viewing' && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Walkthrough Slots Available
            </span>
          )}
          {inquiryType === 'booking' && (
            <span className="text-[10px] font-bold text-lime-800 bg-lime-50 px-2 py-0.5 rounded-full border border-lime-200/60">
              Zero-Brokerage Move-in
            </span>
          )}
        </label>
      )}

      {/* POPOVER TRIGGER BUTTON */}
      {mode === 'popover' && (
        <button
          type="button"
          id={id}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3.5 py-2.5 sm:py-3 bg-white hover:bg-slate-50 border rounded-2xl flex items-center justify-between transition-all cursor-pointer text-left shadow-2xs group ${
            isOpen
              ? 'border-slate-900 ring-2 ring-slate-900/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-[#a3e635]/20 text-slate-800 flex items-center justify-center shrink-0 transition-colors">
              <Calendar className="w-4 h-4 text-slate-900" />
            </div>
            <div className="truncate">
              {value ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    {formatHumanDisplay(value)}
                  </span>
                  {relativeBadge && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-[#a3e635] shrink-0">
                      {relativeBadge}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs sm:text-sm font-medium text-slate-400">
                  {placeholder}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-slate-700">
            <CalendarDays className="w-4 h-4" />
          </div>
        </button>
      )}

      {/* CALENDAR BODY (INLINE OR POPOVER) */}
      <AnimatePresence>
        {(isOpen || mode === 'inline') && (
          <motion.div
            initial={mode === 'popover' ? { opacity: 0, y: -6, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={mode === 'popover' ? { opacity: 0, y: -6, scale: 0.98 } : undefined}
            transition={{ duration: 0.15 }}
            className={`${
              mode === 'popover'
                ? 'absolute left-0 right-0 z-50 mt-1.5 p-4 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-3.5 max-w-sm sm:max-w-md w-full'
                : 'p-4 bg-slate-50/80 rounded-3xl border border-slate-200/80 space-y-3.5 w-full'
            }`}
          >
            {/* Quick Presets Bar */}
            {quickPresets && (
              <div className="space-y-1.5 pb-2 border-b border-slate-100">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#a3e635]" />
                  <span>Quick Select</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {getPresets().map((preset) => {
                    const isPresetSelected = value === preset.dateStr;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          onChange(preset.dateStr);
                          const pDate = parseIso(preset.dateStr);
                          setViewYear(pDate.getFullYear());
                          setViewMonth(pDate.getMonth());
                          if (mode === 'popover') setIsOpen(false);
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-full whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                          isPresetSelected
                            ? 'bg-slate-950 text-[#a3e635] shadow-2xs'
                            : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                        title={preset.hint}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Calendar Month Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 font-heading">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h4>
                {(viewMonth !== today.getMonth() || viewYear !== today.getFullYear()) && (
                  <button
                    type="button"
                    onClick={handleJumpToday}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id={`${id}-prev-month`}
                  disabled={!canGoPrev}
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                  className={`w-7 h-7 rounded-xl flex items-center justify-center border border-slate-200 transition-colors ${
                    canGoPrev
                      ? 'bg-white hover:bg-slate-100 text-slate-700 cursor-pointer'
                      : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  id={`${id}-next-month`}
                  onClick={handleNextMonth}
                  aria-label="Next month"
                  className="w-7 h-7 rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((wd, index) => (
                <div
                  key={wd}
                  className={`text-[10px] font-black tracking-wider uppercase py-1 ${
                    index === 0 || index === 6 ? 'text-amber-700/80 font-extrabold' : 'text-slate-400'
                  }`}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1" role="grid">
              {/* Empty offset padding cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Month Day Cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDate = new Date(viewYear, viewMonth, dayNum);
                cellDate.setHours(0, 0, 0, 0);
                const cellIso = formatIso(cellDate);

                const isPast = cellDate < effectiveMinDate;
                const isSelected = value === cellIso;
                const isCurrentToday = cellIso === todayIso;
                const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleSelectDate(dayNum)}
                    aria-label={`${MONTH_NAMES[viewMonth]} ${dayNum}, ${viewYear}`}
                    className={`aspect-square w-full rounded-xl text-xs font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer min-h-[36px] sm:min-h-[40px] ${
                      isPast
                        ? 'text-slate-300 opacity-40 cursor-not-allowed line-through'
                        : isSelected
                        ? 'bg-slate-950 text-[#a3e635] font-black shadow-md scale-105 z-10 ring-2 ring-slate-900/20'
                        : isCurrentToday
                        ? 'border-2 border-[#a3e635] text-slate-900 bg-[#a3e635]/15 hover:bg-[#a3e635]/25'
                        : isWeekend
                        ? 'text-amber-900 hover:bg-slate-100 font-extrabold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {/* Small dot badge for today or availability */}
                    {isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#a3e635] mt-0.5" />
                    )}
                    {!isSelected && !isPast && (
                      <span
                        className={`w-1 h-1 rounded-full mt-0.5 ${
                          isWeekend ? 'bg-amber-400' : 'bg-emerald-400/80'
                        }`}
                        title={inquiryType === 'viewing' ? 'Walkthrough Slot Open' : 'Available'}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Summary / Confirmation */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold truncate">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {value ? (
                    <>
                      <span className="font-extrabold text-slate-900">
                        {formatHumanDisplay(value)}
                      </span>{' '}
                      {inquiryType === 'viewing' ? '(Walkthrough)' : '(Move-in)'}
                    </>
                  ) : (
                    'Please tap a date on the calendar'
                  )}
                </span>
              </div>

              {mode === 'popover' && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-[#a3e635] text-xs font-black rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Done
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {helperText && <p className="text-[11px] text-slate-500 font-medium">{helperText}</p>}
    </div>
  );
};
