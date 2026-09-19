/**
 * Subscription plan catalogue — shared by the server (enforcement, billing) and the UI (pricing page,
 * owner Subscription view). Prices are per owner workspace per month, in INR, excluding GST.
 */

export type PlanId = 'starter' | 'professional' | 'business';

export interface PlanLimits {
  /** Maximum listings (any status except archived) an owner may hold. `null` = unlimited. */
  maxProperties: number | null;
  /** Maximum active staff accounts. `null` = unlimited. */
  maxStaff: number | null;
}

export interface PlanFeatures {
  rentReminders: boolean;
  analytics: boolean;
  pdfReports: boolean;
  whatsappNotifications: boolean;
  featuredEligible: boolean;
  prioritySupport: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  /** Price when billed yearly (per month equivalent); 0 for the free plan. */
  yearlyPrice: number;
  limits: PlanLimits;
  features: PlanFeatures;
  highlights: string[];
  recommended?: boolean;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'List one property and manage enquiries — free forever.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    limits: { maxProperties: 1, maxStaff: 1 },
    features: {
      rentReminders: false,
      analytics: false,
      pdfReports: false,
      whatsappNotifications: false,
      featuredEligible: false,
      prioritySupport: false,
    },
    highlights: [
      '1 published property',
      'Leads, visits and bookings pipeline',
      'Online rent collection (platform fee applies)',
      '1 staff login',
      'Email notifications',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    tagline: 'For owners running 2–10 properties with a small team.',
    monthlyPrice: 999,
    yearlyPrice: 799,
    recommended: true,
    limits: { maxProperties: 10, maxStaff: 10 },
    features: {
      rentReminders: true,
      analytics: true,
      pdfReports: true,
      whatsappNotifications: true,
      featuredEligible: true,
      prioritySupport: false,
    },
    highlights: [
      'Up to 10 properties',
      'Up to 10 staff with roles & permissions',
      'Automated rent reminders (email + WhatsApp)',
      'Occupancy & revenue analytics',
      'Audit-ready PDF statements',
      'Eligible for Featured placement',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'Multi-city operators and hostel chains.',
    monthlyPrice: 2999,
    yearlyPrice: 2499,
    limits: { maxProperties: null, maxStaff: null },
    features: {
      rentReminders: true,
      analytics: true,
      pdfReports: true,
      whatsappNotifications: true,
      featuredEligible: true,
      prioritySupport: true,
    },
    highlights: [
      'Unlimited properties and staff',
      'Everything in Professional',
      'Priority support with a named account manager',
      'Custom roles and bulk inventory tools',
      'Quarterly re-verification visits included',
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ['starter', 'professional', 'business'];

export type BillingInterval = 'monthly' | 'yearly';

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS;
}

export function planRank(id: PlanId): number {
  return PLAN_ORDER.indexOf(id);
}

/** Total INR charged for one billing period of a plan (excluding GST). */
export function planPeriodAmount(id: PlanId, interval: BillingInterval): number {
  const plan = PLANS[id];
  return interval === 'yearly' ? plan.yearlyPrice * 12 : plan.monthlyPrice;
}

/** One-off / recurring add-ons owners can buy per listing (INR, excluding GST). */
export const ADDONS = {
  /** NestIn Verified site visit + 8-point checklist; badge valid for VERIFICATION_VALIDITY_MONTHS. */
  verificationVisit: 1499,
  /** Promoted placement at the top of search results, per listing per month. */
  featuredPerMonth: 999,
} as const;

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
