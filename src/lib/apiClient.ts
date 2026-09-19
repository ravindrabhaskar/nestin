// NestIn API client — the single place the frontend talks to the backend.
import type { PlanDefinition, PlanId } from './domain/plans';

const API_BASE = '/api/v1';
const TOKEN_KEY = 'nestin_auth_token';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // storage unavailable (private mode) — session lives in memory only
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },
  /** Subscribe to "session is no longer valid" signals coming from any API call. */
  onUnauthorized(listener: Listener): () => void {
    unauthorizedListeners.add(listener);
    return () => unauthorizedListeners.delete(listener);
  },
};

function correlationId(): string {
  return `fe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ApiEnvelope<T> {
  data: T;
  metadata: Record<string, unknown> & { total?: number; page?: number; pageSize?: number; totalPages?: number };
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time; concurrent 401s share the same attempt. */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok || !json?.data?.token) return false;
        tokenStore.set(json.data.token);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/** Seconds until the stored access token expires (NaN when there is none). */
export function accessTokenSecondsLeft(): number {
  const token = tokenStore.get();
  if (!token) return NaN;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp - Math.floor(Date.now() / 1000);
  } catch {
    return NaN;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { auth?: boolean; envelope?: false }
): Promise<T>;
async function request<T>(
  method: string,
  path: string,
  body: unknown,
  opts: { auth?: boolean; envelope: true }
): Promise<ApiEnvelope<T>>;
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: { auth?: boolean; envelope?: boolean; noRefresh?: boolean } = {}
): Promise<T | ApiEnvelope<T>> {
  const headers: Record<string, string> = { 'X-Correlation-Id': correlationId() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // Renew proactively when the token is about to lapse so users never see a failed request.
  if (opts.auth !== false && !opts.noRefresh) {
    const left = accessTokenSecondsLeft();
    if (Number.isFinite(left) && left < 120) await refreshAccessToken();
  }
  const token = opts.auth === false ? null : tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Unable to reach the NestIn server. Please check your connection and try again.'
    );
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) {
    const code = payload.error?.code || `HTTP_${res.status}`;
    const message = payload.error?.message || `Request failed (${res.status})`;
    if (res.status === 401 && token && !opts.noRefresh && !path.startsWith('/auth/refresh')) {
      // Access tokens are short-lived; try one silent refresh with the httpOnly cookie, then retry.
      if (await refreshAccessToken()) {
        return request<T>(method, path, body, { ...opts, noRefresh: true } as never);
      }
      tokenStore.clear();
      unauthorizedListeners.forEach((l) => l());
    }
    throw new ApiError(res.status, code, message, payload.error?.details);
  }
  const data = (payload.data !== undefined ? payload.data : payload) as T;
  if (opts.envelope) return { data, metadata: payload.metadata || {} };
  return data;
}

export const http = {
  get: <T>(path: string, opts?: { auth?: boolean }) => request<T>('GET', path, undefined, opts),
  getWithMeta: <T>(path: string, opts?: { auth?: boolean }) =>
    request<T>('GET', path, undefined, { ...opts, envelope: true }),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) => request<T>('POST', path, body ?? {}, opts),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};

// ---------------------------------------------------------------------------------------------
// Typed endpoint groups
// ---------------------------------------------------------------------------------------------

export const ApiClient = {
  health: () =>
    http.get<{ status: string; version: string; googleSignIn: boolean; demoData: boolean }>('/health', { auth: false }),

  auth: {
    config: () =>
      http.get<{ googleClientId: string | null; demoMode: boolean; razorpayKeyId: string | null }>('/auth/config', {
        auth: false,
      }),
    forgotPassword: (email: string) =>
      http.post<{ sent: boolean }>('/auth/forgot-password', { email }, { auth: false }),
    resetPassword: (token: string, newPassword: string) =>
      http.post<{ reset: boolean }>('/auth/reset-password', { token, newPassword }, { auth: false }),
    verifyEmail: (token: string) => http.post<any>('/auth/verify-email', { token }, { auth: false }),
    resendVerification: () => http.post<{ sent: boolean }>('/auth/resend-verification'),
    register: (data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      city?: string;
      role?: 'tenant' | 'owner';
    }) => http.post<any>('/auth/register', data, { auth: false }),
    login: (data: { email: string; password: string }) => http.post<any>('/auth/login', data, { auth: false }),
    adminLogin: (data: { email: string; password: string; accessCode: string }) =>
      http.post<any>('/auth/admin/login', data, { auth: false }),
    google: (data: { credential: string; role?: 'tenant' | 'owner' }) =>
      http.post<any>('/auth/google', data, { auth: false }),
    validateToken: () => http.post<{ valid: boolean; user: any }>('/auth/validate-token'),
    me: () => http.get<any>('/auth/me'),
    updateProfile: (data: Record<string, unknown>) => http.put<any>('/auth/profile', data),
    changePassword: (data: { currentPassword?: string; newPassword: string }) =>
      http.post<{ changed: boolean }>('/auth/change-password', data),
    getSessions: () => http.get<any[]>('/auth/sessions'),
    revokeSession: (id: string) => http.delete<{ revoked: boolean }>(`/auth/sessions/${id}`),
    logout: () => http.post<{ loggedOut: boolean }>('/auth/logout'),
    deleteAccount: (password?: string) => http.delete<{ deleted: boolean }>('/auth/account', { password }),
  },

  properties: {
    listPublic: (params?: { city?: string; q?: string; category?: string; maxRent?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.city) qs.set('city', params.city);
      if (params?.q) qs.set('q', params.q);
      if (params?.category) qs.set('category', params.category);
      if (params?.maxRent) qs.set('maxRent', String(params.maxRent));
      const query = qs.toString();
      return http.get<any[]>(`/properties/public${query ? `?${query}` : ''}`, { auth: false });
    },
    /** Server-side paginated catalogue search (SQL); returns items plus total/page metadata. */
    search: (params: CatalogueSearchParams) => {
      const qs = new URLSearchParams();
      for (const [k, val] of Object.entries(params)) {
        if (val === undefined || val === null || val === '' || val === false) continue;
        qs.set(k, String(val));
      }
      if (!qs.has('page')) qs.set('page', '1');
      return http.getWithMeta<any[]>(`/properties/public?${qs.toString()}`, { auth: false });
    },
    cities: () => http.get<any[]>('/properties/public/cities', { auth: false }),
    getPublic: (slugOrId: string) => http.get<any>(`/properties/public/${encodeURIComponent(slugOrId)}`),
    addReview: (id: string, data: { rating: number; comment: string; residentRoom?: string }) =>
      http.post<any>(`/properties/public/${id}/reviews`, data),
    listOwner: () => http.get<any[]>('/properties/owner'),
    create: (data: Record<string, unknown>) => http.post<any>('/properties/owner', data),
    update: (id: string, data: Record<string, unknown>) => http.put<any>(`/properties/owner/${id}`, data),
    remove: (id: string) => http.delete<{ deleted: boolean }>(`/properties/owner/${id}`),
    submit: (id: string) => http.post<{ property: any; message: string }>(`/properties/owner/${id}/submit`),
    setBed: (id: string, data: { roomId: string; bedId: string; isOccupied: boolean; occupantName?: string }) =>
      http.patch<any>(`/properties/owner/${id}/beds`, data),
  },

  crm: {
    snapshot: () => http.get<any>('/crm/snapshot'),
    supportTickets: () => http.get<any[]>('/crm/support'),
    agreements: () => http.get<any[]>('/crm/agreements'),
    createAgreement: (data: Record<string, unknown>) => http.post<any>('/crm/agreements', data),
    voidAgreement: (id: string) => http.post<any>(`/crm/agreements/${id}/void`, {}),
    moveOuts: () => http.get<any[]>('/crm/move-outs'),
    updateMoveOut: (id: string, data: Record<string, unknown>) => http.put<any>(`/crm/move-outs/${id}`, data),
    nps: () => http.get<any>('/crm/nps'),
    replySupport: (id: string, message: string) => http.post<any>(`/crm/support/${id}/messages`, { message }),
    resolveSupport: (id: string) => http.post<any>(`/crm/support/${id}/resolve`),
    upsert: (kind: 'leads' | 'visitors' | 'customers', doc: { id?: string } & Record<string, unknown>) =>
      doc.id ? http.put<any>(`/crm/${kind}/${doc.id}`, doc) : http.post<any>(`/crm/${kind}`, doc),
    remove: (kind: 'leads' | 'visitors' | 'customers', id: string) =>
      http.delete<{ deleted: boolean }>(`/crm/${kind}/${id}`),
    addCustomerPayment: (customerId: string, data: Record<string, unknown>) =>
      http.post<any>(`/crm/customers/${customerId}/payments`, data),
    moveOut: (customerId: string, data: { moveOutDate: string; reason?: string }) =>
      http.post<any>(`/crm/customers/${customerId}/move-out`, data),
    createBooking: (data: Record<string, unknown>) => http.post<any>('/crm/bookings', data),
    updateBooking: (id: string, data: Record<string, unknown>) => http.put<any>(`/crm/bookings/${id}`, data),
    approveBooking: (id: string, data?: { customerId?: string }) =>
      http.post<any>(`/crm/bookings/${id}/approve`, data || {}),
    rejectBooking: (id: string, reason: string) => http.post<any>(`/crm/bookings/${id}/reject`, { reason }),
    cancelBooking: (id: string, reason: string) => http.post<any>(`/crm/bookings/${id}/cancel`, { reason }),
    completeMoveIn: (id: string) => http.post<any>(`/crm/bookings/${id}/complete-move-in`),
    logActivity: (data: { action: string; description: string; type: string }) => http.post<any>('/crm/activity', data),
    createNotification: (data: { title: string; message: string; type: string; linkTo?: string }) =>
      http.post<any>('/crm/notifications', data),
    markNotificationRead: (id: string | 'all') => http.put<{ read: boolean }>(`/crm/notifications/${id}/read`),
  },

  rbac: {
    snapshot: () => http.get<any>('/rbac/snapshot'),
    catalog: () => http.get<any[]>('/rbac/catalog'),
    upsertRole: (doc: { id?: string } & Record<string, unknown>) =>
      doc.id ? http.put<any>(`/rbac/roles/${doc.id}`, doc) : http.post<any>('/rbac/roles', doc),
    deleteRole: (id: string) => http.delete<{ deleted: boolean }>(`/rbac/roles/${id}`),
    upsertEmployee: (doc: { id?: string } & Record<string, unknown>) =>
      doc.id ? http.put<any>(`/rbac/employees/${doc.id}`, doc) : http.post<any>('/rbac/employees', doc),
    resetEmployeePassword: (id: string) =>
      http.post<{ temporaryPassword: string }>(`/rbac/employees/${id}/reset-password`),
    deleteEmployee: (id: string) => http.delete<{ deleted: boolean }>(`/rbac/employees/${id}`),
    logAudit: (data: Record<string, unknown>) => http.post<any>('/rbac/audit', data),
  },

  tenant: {
    bookings: () => http.get<any[]>('/tenant/bookings'),
    createBooking: (data: Record<string, unknown>) =>
      http.post<{ booking: any; tenantBooking: any }>('/tenant/bookings', data),
    cancelBooking: (id: string, reason?: string) => http.post<any>(`/tenant/bookings/${id}/cancel`, { reason }),
    scheduleVisit: (data: Record<string, unknown>) => http.post<any>('/tenant/visits', data),
    payments: () => http.get<any[]>('/tenant/payments'),
    pay: (data: {
      amount: number;
      type?: string;
      paymentMethod?: string;
      bookingId?: string;
      idempotencyKey?: string;
    }) => http.post<any>('/tenant/payments', data),
    checkout: (data: { amount?: number; type?: string; bookingId?: string; paymentId?: string }) =>
      http.post<CheckoutOrder>('/tenant/payments/checkout', data),
    completeCheckout: (data: {
      paymentId: string;
      paymentMethod?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    }) => http.post<any>('/tenant/payments/checkout/complete', data),
    documents: () => http.get<any[]>('/tenant/documents'),
    addDocument: (data: Record<string, unknown>) => http.post<any>('/tenant/documents', data),
    deleteDocument: (id: string) => http.delete<{ deleted: boolean }>(`/tenant/documents/${id}`),
    tickets: () => http.get<any[]>('/tenant/support'),
    createTicket: (data: Record<string, unknown>) => http.post<any>('/tenant/support', data),
    maintenanceCategories: () =>
      http.get<Record<string, { label: string; slaHours: number }>>('/tenant/maintenance-categories'),
    agreements: () => http.get<any[]>('/tenant/agreements'),
    requestAgreementOtp: (id: string) =>
      http.post<{ sentTo: string[]; expiresAt: string; devOtp?: string }>(`/tenant/agreements/${id}/request-otp`, {}),
    signAgreement: (id: string, data: { otp: string; accepted: boolean; fullName?: string }) =>
      http.post<any>(`/tenant/agreements/${id}/sign`, data),
    moveOut: () => http.get<any>('/tenant/move-out'),
    requestMoveOut: (data: { moveOutDate: string; reason?: string }) => http.post<any>('/tenant/move-out', data),
    cancelMoveOut: (id: string) => http.post<any>(`/tenant/move-out/${id}/cancel`, {}),
    referrals: () => http.get<any>('/tenant/referrals'),
    roommates: (propertyId: string) => http.get<any>(`/tenant/roommates/${encodeURIComponent(propertyId)}`),
    surveyDue: () => http.get<{ due: boolean; propertyName?: string }>('/tenant/survey'),
    autopay: () => http.get<any>('/tenant/autopay'),
    createAutopay: (data: { dayOfMonth: number; amount?: number }) => http.post<any>('/tenant/autopay', data),
    updateAutopay: (id: string, action: 'pause' | 'resume' | 'cancel') =>
      http.post<any>(`/tenant/autopay/${id}`, { action }),
    submitSurvey: (data: { score: number; comment?: string }) => http.post<any>('/tenant/survey', data),
    replyTicket: (id: string, message: string) => http.post<any>(`/tenant/support/${id}/messages`, { message }),
    resolveTicket: (id: string) => http.post<any>(`/tenant/support/${id}/resolve`),
    wishlist: () => http.get<any[]>('/tenant/wishlist'),
    saveToWishlist: (propertyId: string) =>
      http.put<{ saved: boolean; propertyIds: string[] }>(`/tenant/wishlist/${propertyId}`),
    removeFromWishlist: (propertyId: string) =>
      http.delete<{ saved: boolean; propertyIds: string[] }>(`/tenant/wishlist/${propertyId}`),
    clearWishlist: () => http.delete<{ cleared: boolean }>('/tenant/wishlist'),
    notifications: () => http.get<any[]>('/tenant/notifications'),
    markNotificationRead: (id: string | 'all') => http.put<{ read: boolean }>(`/tenant/notifications/${id}/read`),
  },

  admin: {
    analytics: (days = 30) => http.get<any>(`/admin/analytics?days=${days}`),
    stats: () => http.get<any>('/admin/stats'),
    support: () => http.get<any[]>('/admin/support'),
    replySupport: (id: string, message: string) => http.post<any>(`/admin/support/${id}/messages`, { message }),
    resolveSupport: (id: string) => http.post<any>(`/admin/support/${id}/resolve`),
    outbox: () => http.get<any[]>('/admin/outbox'),
    integrations: () =>
      http.get<{ messaging: { email: string; whatsapp: string }; storage: string; payments: string }>(
        '/admin/integrations'
      ),
    users: (role?: string) => http.get<any[]>(`/admin/users${role ? `?role=${role}` : ''}`),
    setUserStatus: (id: string, status: 'active' | 'suspended') =>
      http.put<any>(`/admin/users/${id}/status`, { status }),
    properties: () => http.get<any[]>('/admin/properties'),
    approveProperty: (id: string, options?: ApproveOptions) =>
      http.post<any>(`/admin/properties/${id}/approve`, options || {}),
    rejectProperty: (id: string, reason: string) => http.post<any>(`/admin/properties/${id}/reject`, { reason }),
    revokeVerification: (id: string, reason: string) =>
      http.post<any>(`/admin/properties/${id}/revoke-verification`, { reason }),
    verificationSweep: () => http.post<{ expired: number; dueSoon: number }>('/admin/properties/verification-sweep'),
    billing: () => http.get<{ stats: BillingStats; subscriptions: AdminSubscriptionRow[] }>('/admin/billing'),
    setPlan: (ownerId: string, plan: string, months?: number) =>
      http.put<AdminSubscriptionRow>(`/admin/billing/${ownerId}`, { plan, months }),
    backups: () => http.get<BackupStatus>('/admin/ops/backups'),
    runBackup: () => http.post<BackupInfo>('/admin/ops/backups'),
    metrics: () => http.get<OpsMetrics>('/admin/ops/metrics'),
    setBadges: (id: string, badges: { isNestinVerified?: boolean; isFeatured?: boolean; isZeroBrokerage?: boolean }) =>
      http.patch<any>(`/admin/properties/${id}/badges`, badges),
    bookings: () => http.get<any[]>('/admin/bookings'),
    inbound: (kind?: string) => http.get<any[]>(`/admin/inbound${kind ? `?kind=${kind}` : ''}`),
    updateInbound: (id: string, status: string) => http.put<any>(`/admin/inbound/${id}`, { status }),
    audit: (params?: { ownerId?: string; type?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.ownerId) qs.set('ownerId', params.ownerId);
      if (params?.type) qs.set('type', params.type);
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString();
      return http.get<any[]>(`/admin/audit${q ? `?${q}` : ''}`);
    },
  },

  operations: {
    expenses: (params?: { month?: string; propertyId?: string; category?: string }) => {
      const qs = new URLSearchParams();
      for (const [k, val] of Object.entries(params || {})) if (val) qs.set(k, String(val));
      return http.get<{ categories: string[]; expenses: any[] }>(`/operations/expenses${qs.size ? `?${qs}` : ''}`);
    },
    addExpense: (data: Record<string, unknown>) => http.post<any>('/operations/expenses', data),
    updateExpense: (id: string, data: Record<string, unknown>) => http.put<any>(`/operations/expenses/${id}`, data),
    deleteExpense: (id: string) => http.delete<{ deleted: boolean }>(`/operations/expenses/${id}`),
    pnl: (month?: string) => http.get<any>(`/operations/pnl${month ? `?month=${month}` : ''}`),
    utilities: (propertyId?: string) =>
      http.get<any[]>(`/operations/utilities${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ''}`),
    addUtilityReading: (data: Record<string, unknown>) => http.post<any>('/operations/utilities', data),
    billUtility: (id: string) => http.post<any>(`/operations/utilities/${id}/bill`, {}),
    deleteUtility: (id: string) => http.delete<{ deleted: boolean }>(`/operations/utilities/${id}`),
    tasks: (params?: { mine?: boolean; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.mine) qs.set('mine', 'true');
      if (params?.status) qs.set('status', params.status);
      return http.get<any[]>(`/operations/tasks${qs.size ? `?${qs}` : ''}`);
    },
    createTask: (data: Record<string, unknown>) => http.post<any>('/operations/tasks', data),
    updateTask: (id: string, data: Record<string, unknown>) => http.put<any>(`/operations/tasks/${id}`, data),
    deleteTask: (id: string) => http.delete<{ deleted: boolean }>(`/operations/tasks/${id}`),
    forecast: () => http.get<any>('/operations/forecast'),
    comparison: () => http.get<any[]>('/operations/comparison'),
    importResidents: (csv: string) => http.post<any>('/operations/import/residents', { csv }),
    importTemplateUrl: `${API_BASE}/operations/import/residents/template`,
  },
  billing: {
    view: () => http.get<SubscriptionView>('/billing'),
    checkout: (data: { plan: string; interval: 'monthly' | 'yearly' }) =>
      http.post<SubscriptionCheckout>('/billing/checkout', data),
    completeCheckout: (data: {
      invoiceId: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    }) => http.post<SubscriptionView>('/billing/checkout/complete', data),
    cancel: (cancel: boolean) => http.post<SubscriptionView>('/billing/cancel', { cancel }),
    addons: () =>
      http.get<{ prices: { verificationVisit: number; featuredPerMonth: number }; orders: any[] }>('/billing/addons'),
    addonCheckout: (data: { type: 'verification' | 'featured'; propertyId: string; months?: number }) =>
      http.post<any>('/billing/addons/checkout', data),
    completeAddonCheckout: (data: Record<string, unknown>) => http.post<any>('/billing/addons/checkout/complete', data),
  },

  push: {
    config: () => http.get<{ enabled: boolean; publicKey: string | null }>('/push/config', { auth: false }),
    subscribe: (subscription: unknown) =>
      http.post<{ subscribed: boolean; id: string }>('/push/subscribe', subscription),
    unsubscribe: (endpoint: string) => http.post<{ unsubscribed: boolean }>('/push/unsubscribe', { endpoint }),
  },

  public: {
    stats: () => http.get<PublicStats>('/public/stats', { auth: false }),
    contact: (data: Record<string, unknown>) =>
      http.post<{ ticketNumber: string; id: string }>('/public/contact', data, { auth: false }),
    ownerDemo: (data: Record<string, unknown>) =>
      http.post<{ id: string }>('/public/owner-demo', data, { auth: false }),
    newsletter: (email: string) => http.post<{ subscribed: boolean }>('/public/newsletter', { email }, { auth: false }),
  },

  audit: {
    getLogs: (limit = 50, eventType?: string) =>
      http.get<any[]>(`/audit/logs?limit=${limit}${eventType ? `&eventType=${encodeURIComponent(eventType)}` : ''}`),
  },
};

export interface CatalogueSearchParams {
  city?: string;
  area?: string;
  q?: string;
  category?: string;
  type?: string;
  minRent?: number;
  maxRent?: number;
  verified?: boolean;
  available?: boolean;
  food?: boolean;
  minRating?: number;
  /** Comma-separated: single,double,triple,four,dormitory */
  roomTypes?: string;
  /** Comma-separated amenity names (all must match). */
  amenities?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: 'relevance' | 'rent_asc' | 'rent_desc' | 'rating' | 'newest' | 'nearest';
  page?: number;
  pageSize?: number;
}

export interface ApproveOptions {
  isNestinVerified?: boolean;
  isFeatured?: boolean;
  isZeroBrokerage?: boolean;
  checklist?: Record<string, boolean>;
  notes?: string;
  siteVisitDate?: string;
  evidenceUrls?: string[];
}

export interface PublicStats {
  publishedListings: number;
  verifiedListings: number;
  cities: number;
  bedsListed: number;
  residentsHoused: number;
  ownersOnboarded: number;
  citiesBreakdown: Array<{ city: string; listings: number; minRent: number | null }>;
  generatedAt: string;
}

export interface SubscriptionRecord {
  id: string;
  ownerId: string;
  plan: PlanId;
  interval: 'monthly' | 'yearly';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  cancelAtPeriodEnd: boolean;
  grantedBy?: string;
}

export interface SubscriptionInvoice {
  id: string;
  plan: PlanId;
  interval: string;
  invoiceNumber: string;
  subtotal: number;
  gstPercent: number;
  gst: number;
  amount: number;
  status: 'Pending' | 'Paid' | 'Failed';
  gateway: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  createdAt: string;
}

export interface PlanUsage {
  properties: { used: number; limit: number | null };
  staff: { used: number; limit: number | null };
}

export interface SubscriptionView {
  subscription: SubscriptionRecord;
  plan: PlanDefinition;
  usage: PlanUsage;
  invoices: SubscriptionInvoice[];
  plans: PlanDefinition[];
  gstPercent: number;
  platformFeePercent: number;
  payments: 'razorpay' | 'simulated';
}

export interface SubscriptionCheckout {
  simulated: boolean;
  invoiceId: string;
  orderId?: string;
  keyId?: string;
  amount: number;
  currency: 'INR';
  description: string;
  prefill: { name: string; email: string; contact?: string };
}

export interface AdminSubscriptionRow extends SubscriptionRecord {
  ownerName: string;
  ownerEmail: string;
  usage: PlanUsage;
  lifetimeValue: number;
}

export interface BillingStats {
  mrr: number;
  activePaid: number;
  trialing: number;
  pastDue: number;
  byPlan: Record<PlanId, number>;
  subscriptionRevenue: { total: number; last30Days: number };
  platformFees: { total: number; last30Days: number };
}

export interface BackupInfo {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  location: 'local' | 's3';
}

export interface BackupStatus {
  enabled: boolean;
  directory: string;
  keep: number;
  mirroredToS3: boolean;
  lastBackupAt: string | null;
  databaseSizeBytes: number;
  backups: BackupInfo[];
}

export interface OpsMetrics {
  requestsTotal: number;
  errorsTotal: number;
  inFlight: number;
  databaseSizeBytes: number;
  lastBackupAt: string | null;
  routes: Array<{ route: string; count: number; avgMs: number; p95Ms: number; statuses: Record<string, number> }>;
}

export interface CheckoutOrder {
  simulated: boolean;
  paymentId: string;
  orderId?: string;
  amount: number;
  currency: 'INR';
  keyId?: string;
  description: string;
  prefill: { name: string; email: string; contact?: string };
}

export interface UploadedFile {
  id: string;
  key: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
  sizeLabel: string;
}

/**
 * Client-side image pipeline: photos are resized to a sensible maximum edge and re-encoded (WebP
 * when the browser can, else JPEG) before upload, so a 6 MB phone photo becomes ~200 KB without
 * any native image library on the server. Non-images and documents are passed through untouched.
 */
export async function optimiseImage(file: File, opts: { maxEdge?: number; quality?: number } = {}): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || typeof createImageBitmap !== 'function') return file;
  const maxEdge = opts.maxEdge ?? 1600;
  const quality = opts.quality ?? 0.82;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 400 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const type = (await supportsWebp()) ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/webp' ? '.webp' : '.jpg');
    return new File([blob], name, { type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

let webpSupport: Promise<boolean> | null = null;
function supportsWebp(): Promise<boolean> {
  if (!webpSupport) {
    webpSupport = new Promise((resolve) => {
      const c = document.createElement('canvas');
      resolve(c.toDataURL('image/webp').startsWith('data:image/webp'));
    });
  }
  return webpSupport;
}

/** Multipart upload; returns the URL to reference from profiles, listings or documents. */
export async function uploadFile(file: File, purpose: 'avatar' | 'property' | 'document'): Promise<UploadedFile> {
  const form = new FormData();
  form.append('purpose', purpose);
  const upload =
    purpose === 'document' ? file : await optimiseImage(file, { maxEdge: purpose === 'avatar' ? 512 : 1600 });
  form.append('file', upload, upload.name);
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/files`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Upload failed: unable to reach the server.');
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) {
    throw new ApiError(
      res.status,
      payload.error?.code || `HTTP_${res.status}`,
      payload.error?.message || `Upload failed (${res.status})`
    );
  }
  return payload.data as UploadedFile;
}

export type Api = typeof ApiClient;
