import React from 'react';
import { Icon as IconifyIcon } from '@iconify/react';

// Standardized Icon Sizes as per Nestin Design System
export type IconSize = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | number;

export const ICON_SIZES: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  standard: 16,
  md: 18,
  medium: 18,
  lg: 20,
  large: 20,
  xl: 24,
  feature: 24,
  '2xl': 32,
  hero: 32,
};

// Semantic Icon Registry mapping to standardized clean Lucide outline icons via Iconify
export const ICON_REGISTRY: Record<string, string> = {
  // Navigation & Core
  dashboard: 'lucide:layout-dashboard',
  home: 'lucide:home',
  properties: 'lucide:building-2',
  property: 'lucide:building-2',
  building: 'lucide:building-2',
  vacancies: 'lucide:door-open',
  leads: 'lucide:user-plus',
  lead: 'lucide:user-plus',
  bookings: 'lucide:calendar-check',
  booking: 'lucide:calendar-check',
  visitors: 'lucide:user-check',
  visitor: 'lucide:user-check',
  customers: 'lucide:users',
  customer: 'lucide:users',
  tenant: 'lucide:user',
  tenants: 'lucide:users',
  employees: 'lucide:briefcase',
  payments: 'lucide:credit-card',
  payment: 'lucide:credit-card',
  documents: 'lucide:file-text',
  document: 'lucide:file-text',
  reports: 'lucide:bar-chart-3',
  analytics: 'lucide:trending-up',
  notifications: 'lucide:bell',
  notification: 'lucide:bell',
  support: 'lucide:help-circle',
  help: 'lucide:help-circle',
  settings: 'lucide:settings',
  profile: 'lucide:user',
  user: 'lucide:user',
  logout: 'lucide:log-out',
  login: 'lucide:log-in',

  // Actions & Operations
  search: 'lucide:search',
  filter: 'lucide:sliders-horizontal',
  sort: 'lucide:arrow-up-down',
  plus: 'lucide:plus',
  add: 'lucide:plus',
  edit: 'lucide:edit-3',
  delete: 'lucide:trash-2',
  trash: 'lucide:trash-2',
  download: 'lucide:download',
  export: 'lucide:file-down',
  upload: 'lucide:upload-cloud',
  refresh: 'lucide:refresh-cw',
  close: 'lucide:x',
  check: 'lucide:check',
  checkCircle: 'lucide:check-circle-2',
  copy: 'lucide:copy',
  share: 'lucide:share-2',
  printer: 'lucide:printer',
  more: 'lucide:more-vertical',
  moreHorizontal: 'lucide:more-horizontal',
  view: 'lucide:eye',
  eye: 'lucide:eye',
  eyeOff: 'lucide:eye-off',
  lock: 'lucide:lock',
  unlock: 'lucide:lock-open',

  // Status & Feedback
  success: 'lucide:check-circle-2',
  warning: 'lucide:alert-triangle',
  error: 'lucide:alert-circle',
  info: 'lucide:info',
  clock: 'lucide:clock',
  pending: 'lucide:clock',
  calendar: 'lucide:calendar',
  star: 'lucide:star',
  heart: 'lucide:heart',
  verified: 'lucide:badge-check',
  shield: 'lucide:shield-check',
  shieldCheck: 'lucide:shield-check',
  roles: 'lucide:shield-check',
  zap: 'lucide:zap',

  // Communication & Channels
  phone: 'lucide:phone',
  mail: 'lucide:mail',
  email: 'lucide:mail',
  whatsapp: 'lucide:message-circle',
  chat: 'lucide:message-square',
  externalLink: 'lucide:external-link',
  navigation: 'lucide:navigation',
  location: 'lucide:map-pin',
  mapPin: 'lucide:map-pin',
  map: 'lucide:map',
  compass: 'lucide:compass',

  // Property & Living Features
  bed: 'lucide:bed-double',
  bedSingle: 'lucide:bed',
  room: 'lucide:door-closed',
  bath: 'lucide:bath',
  wifi: 'lucide:wifi',
  ac: 'lucide:wind',
  housekeeping: 'lucide:sparkles',
  laundry: 'lucide:shirt',
  powerBackup: 'lucide:zap',
  cctv: 'lucide:shield-check',
  water: 'lucide:droplets',
  study: 'lucide:laptop',
  food: 'lucide:utensils-crossed',
  gym: 'lucide:dumbbell',
  parking: 'lucide:car',
  tv: 'lucide:tv',
  geyser: 'lucide:flame',
  lift: 'lucide:arrow-up-down',
  biometric: 'lucide:key-round',
  fridge: 'lucide:refrigerator',
  gaming: 'lucide:gamepad-2',
  cafe: 'lucide:coffee',
  camera: 'lucide:camera',
  video: 'lucide:video',
  tour360: 'lucide:orbit',

  // Directional & Controls
  chevronRight: 'lucide:chevron-right',
  chevronLeft: 'lucide:chevron-left',
  chevronDown: 'lucide:chevron-down',
  chevronUp: 'lucide:chevron-up',
  arrowRight: 'lucide:arrow-right',
  arrowLeft: 'lucide:arrow-left',
  arrowUp: 'lucide:arrow-up',
  arrowDown: 'lucide:arrow-down',
};

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  name?: string;
  icon?: string;
  size?: IconSize;
  color?: string;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  icon,
  size = 'base',
  color,
  strokeWidth = 2,
  className = '',
  ariaLabel,
  ...props
}) => {
  // Resolve icon string
  let iconName = icon;
  if (!iconName && name) {
    iconName = ICON_REGISTRY[name] || (name.startsWith('lucide:') ? name : `lucide:${name}`);
  }
  if (!iconName) {
    iconName = 'lucide:help-circle';
  }

  // Resolve pixel size
  const pixelSize = typeof size === 'number' ? size : ICON_SIZES[size] || 16;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        color: color || undefined,
      }}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      {...props}
    >
      <IconifyIcon
        icon={iconName}
        width={pixelSize}
        height={pixelSize}
        style={{
          strokeWidth,
        }}
      />
    </span>
  );
};

export default Icon;
