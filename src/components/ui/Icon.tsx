import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  BarChart3,
  Bath,
  Bed,
  BedDouble,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Coffee,
  Compass,
  Copy,
  CreditCard,
  DoorClosed,
  DoorOpen,
  Download,
  Droplets,
  Dumbbell,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  Flame,
  Gamepad2,
  Heart,
  HelpCircle,
  Home,
  Info,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Lock,
  LockOpen,
  LogIn,
  LogOut,
  Mail,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Navigation,
  Orbit,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Refrigerator,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Tv,
  UploadCloud,
  User,
  UserCheck,
  UserPlus,
  Users,
  UtensilsCrossed,
  Video,
  Wifi,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

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

/**
 * Semantic icon registry backed by the bundled `lucide-react` components. Icons used to be
 * resolved through Iconify at runtime, which fetched SVG data from api.iconify.design on every
 * page load — a third-party dependency that broke offline/PWA use and violated the CSP. Every
 * icon is now a static import, so adding one means adding it here (tree-shaking keeps the rest
 * of Lucide out of the bundle).
 */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  // Navigation & Core
  dashboard: LayoutDashboard,
  home: Home,
  properties: Building2,
  property: Building2,
  building: Building2,
  vacancies: DoorOpen,
  leads: UserPlus,
  lead: UserPlus,
  bookings: CalendarCheck,
  booking: CalendarCheck,
  visitors: UserCheck,
  visitor: UserCheck,
  customers: Users,
  customer: Users,
  tenant: User,
  tenants: Users,
  employees: Briefcase,
  payments: CreditCard,
  payment: CreditCard,
  documents: FileText,
  document: FileText,
  reports: BarChart3,
  analytics: TrendingUp,
  notifications: Bell,
  notification: Bell,
  support: HelpCircle,
  help: HelpCircle,
  settings: Settings,
  profile: User,
  user: User,
  logout: LogOut,
  login: LogIn,
  menu: Menu,
  bookmark: Bookmark,

  // Actions & Operations
  search: Search,
  filter: SlidersHorizontal,
  sort: ArrowUpDown,
  plus: Plus,
  add: Plus,
  edit: Edit3,
  delete: Trash2,
  trash: Trash2,
  download: Download,
  export: FileDown,
  upload: UploadCloud,
  refresh: RefreshCw,
  close: X,
  check: Check,
  checkCircle: CheckCircle2,
  copy: Copy,
  share: Share2,
  printer: Printer,
  more: MoreVertical,
  moreHorizontal: MoreHorizontal,
  view: Eye,
  eye: Eye,
  eyeOff: EyeOff,
  lock: Lock,
  unlock: LockOpen,

  // Status & Feedback
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  clock: Clock,
  pending: Clock,
  calendar: Calendar,
  star: Star,
  heart: Heart,
  verified: BadgeCheck,
  shield: ShieldCheck,
  shieldCheck: ShieldCheck,
  roles: ShieldCheck,
  zap: Zap,
  sparkles: Sparkles,

  // Communication & Channels
  phone: Phone,
  mail: Mail,
  email: Mail,
  whatsapp: MessageCircle,
  chat: MessageSquare,
  externalLink: ExternalLink,
  navigation: Navigation,
  location: MapPin,
  mapPin: MapPin,
  map: Map,
  compass: Compass,

  // Property & Living Features
  bed: BedDouble,
  bedSingle: Bed,
  room: DoorClosed,
  bath: Bath,
  wifi: Wifi,
  ac: Wind,
  housekeeping: Sparkles,
  laundry: Shirt,
  powerBackup: Zap,
  cctv: ShieldCheck,
  water: Droplets,
  study: Laptop,
  food: UtensilsCrossed,
  gym: Dumbbell,
  parking: Car,
  tv: Tv,
  geyser: Flame,
  lift: ArrowUpDown,
  biometric: KeyRound,
  fridge: Refrigerator,
  gaming: Gamepad2,
  cafe: Coffee,
  camera: Camera,
  video: Video,
  tour360: Orbit,

  // Directional & Controls
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
};

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  name?: string;
  /** Legacy Iconify-style id (`lucide:map-pin`); only the part after the colon is looked up. */
  icon?: string;
  size?: IconSize;
  color?: string;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}

function resolve(name?: string, icon?: string): LucideIcon {
  const key = (name || icon || '').replace(/^lucide:/, '');
  if (ICON_REGISTRY[key]) return ICON_REGISTRY[key];
  // Accept kebab-case Lucide names for registry keys defined in camelCase (e.g. "shield-check").
  const camel = key.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  if (ICON_REGISTRY[camel]) return ICON_REGISTRY[camel];
  if (import.meta.env.DEV && key) console.warn(`[Icon] unknown icon "${key}" — add it to ICON_REGISTRY`);
  return HelpCircle;
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
  const glyph = resolve(name, icon);
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
      {React.createElement(glyph, { width: pixelSize, height: pixelSize, strokeWidth })}
    </span>
  );
};

export default Icon;
