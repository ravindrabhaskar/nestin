// NestIn API client — the single place the frontend talks to the backend.
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

async function request<T>(method: string, path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'X-Correlation-Id': correlationId() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = opts.auth === false ? null : tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the NestIn server. Please check your connection and try again.');
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) {
    const code = payload.error?.code || `HTTP_${res.status}`;
    const message = payload.error?.message || `Request failed (${res.status})`;
    if (res.status === 401 && token) {
      tokenStore.clear();
      unauthorizedListeners.forEach((l) => l());
    }
    throw new ApiError(res.status, code, message, payload.error?.details);
  }
  return (payload.data !== undefined ? payload.data : payload) as T;
}

export const http = {
  get: <T>(path: string, opts?: { auth?: boolean }) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) => request<T>('POST', path, body ?? {}, opts),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};

// ---------------------------------------------------------------------------------------------
// Typed endpoint groups
// ---------------------------------------------------------------------------------------------

export const ApiClient = {
  health: () => http.get<{ status: string; version: string; googleSignIn: boolean; demoData: boolean }>('/health', { auth: false }),

  auth: {
    config: () => http.get<{ googleClientId: string | null; demoMode: boolean }>('/auth/config', { auth: false }),
    register: (data: { email: string; password: string; fullName: string; phone?: string; city?: string; role?: 'tenant' | 'owner' }) => http.post<any>('/auth/register', data, { auth: false }),
    login: (data: { email: string; password: string }) => http.post<any>('/auth/login', data, { auth: false }),
    adminLogin: (data: { email: string; password: string; accessCode: string }) => http.post<any>('/auth/admin/login', data, { auth: false }),
    google: (data: { credential: string; role?: 'tenant' | 'owner' }) => http.post<any>('/auth/google', data, { auth: false }),
    validateToken: () => http.post<{ valid: boolean; user: any }>('/auth/validate-token'),
    me: () => http.get<any>('/auth/me'),
    updateProfile: (data: Record<string, unknown>) => http.put<any>('/auth/profile', data),
    changePassword: (data: { currentPassword?: string; newPassword: string }) => http.post<{ changed: boolean }>('/auth/change-password', data),
    getSessions: () => http.get<any[]>('/auth/sessions'),
    revokeSession: (id: string) => http.delete<{ revoked: boolean }>(`/auth/sessions/${id}`),
    logout: () => http.post<{ loggedOut: boolean }>('/auth/logout'),
    deleteAccount: (password?: string) => http.delete<{ deleted: boolean }>('/auth/account', { password }),
  },

  properties: {
    listPublic: (params?: { city?: string; q?: string; category?: string; maxRent?: number }) => {
      const qs = new URLSearchParams();
      if (params?.city) qs.set('city', params.city);
      if (params?.q) qs.set('q', params.q);
      if (params?.category) qs.set('category', params.category);
      if (params?.maxRent) qs.set('maxRent', String(params.maxRent));
      const query = qs.toString();
      return http.get<any[]>(`/properties/public${query ? `?${query}` : ''}`, { auth: false });
    },
    cities: () => http.get<any[]>('/properties/public/cities', { auth: false }),
    getPublic: (slugOrId: string) => http.get<any>(`/properties/public/${encodeURIComponent(slugOrId)}`),
    addReview: (id: string, data: { rating: number; comment: string; residentRoom?: string }) => http.post<any>(`/properties/public/${id}/reviews`, data),
    listOwner: () => http.get<any[]>('/properties/owner'),
    create: (data: Record<string, unknown>) => http.post<any>('/properties/owner', data),
    update: (id: string, data: Record<string, unknown>) => http.put<any>(`/properties/owner/${id}`, data),
    remove: (id: string) => http.delete<{ deleted: boolean }>(`/properties/owner/${id}`),
    submit: (id: string) => http.post<{ property: any; message: string }>(`/properties/owner/${id}/submit`),
    setBed: (id: string, data: { roomId: string; bedId: string; isOccupied: boolean; occupantName?: string }) => http.patch<any>(`/properties/owner/${id}/beds`, data),
  },

  crm: {
    snapshot: () => http.get<any>('/crm/snapshot'),
    upsert: (kind: 'leads' | 'visitors' | 'customers', doc: { id?: string } & Record<string, unknown>) =>
      doc.id ? http.put<any>(`/crm/${kind}/${doc.id}`, doc) : http.post<any>(`/crm/${kind}`, doc),
    remove: (kind: 'leads' | 'visitors' | 'customers', id: string) => http.delete<{ deleted: boolean }>(`/crm/${kind}/${id}`),
    addCustomerPayment: (customerId: string, data: Record<string, unknown>) => http.post<any>(`/crm/customers/${customerId}/payments`, data),
    moveOut: (customerId: string, data: { moveOutDate: string; reason?: string }) => http.post<any>(`/crm/customers/${customerId}/move-out`, data),
    createBooking: (data: Record<string, unknown>) => http.post<any>('/crm/bookings', data),
    updateBooking: (id: string, data: Record<string, unknown>) => http.put<any>(`/crm/bookings/${id}`, data),
    approveBooking: (id: string, data?: { customerId?: string }) => http.post<any>(`/crm/bookings/${id}/approve`, data || {}),
    rejectBooking: (id: string, reason: string) => http.post<any>(`/crm/bookings/${id}/reject`, { reason }),
    cancelBooking: (id: string, reason: string) => http.post<any>(`/crm/bookings/${id}/cancel`, { reason }),
    completeMoveIn: (id: string) => http.post<any>(`/crm/bookings/${id}/complete-move-in`),
    logActivity: (data: { action: string; description: string; type: string }) => http.post<any>('/crm/activity', data),
    createNotification: (data: { title: string; message: string; type: string; linkTo?: string }) => http.post<any>('/crm/notifications', data),
    markNotificationRead: (id: string | 'all') => http.put<{ read: boolean }>(`/crm/notifications/${id}/read`),
  },

  rbac: {
    snapshot: () => http.get<any>('/rbac/snapshot'),
    catalog: () => http.get<any[]>('/rbac/catalog'),
    upsertRole: (doc: { id?: string } & Record<string, unknown>) => (doc.id ? http.put<any>(`/rbac/roles/${doc.id}`, doc) : http.post<any>('/rbac/roles', doc)),
    deleteRole: (id: string) => http.delete<{ deleted: boolean }>(`/rbac/roles/${id}`),
    upsertEmployee: (doc: { id?: string } & Record<string, unknown>) => (doc.id ? http.put<any>(`/rbac/employees/${doc.id}`, doc) : http.post<any>('/rbac/employees', doc)),
    resetEmployeePassword: (id: string) => http.post<{ temporaryPassword: string }>(`/rbac/employees/${id}/reset-password`),
    deleteEmployee: (id: string) => http.delete<{ deleted: boolean }>(`/rbac/employees/${id}`),
    logAudit: (data: Record<string, unknown>) => http.post<any>('/rbac/audit', data),
  },

  tenant: {
    bookings: () => http.get<any[]>('/tenant/bookings'),
    createBooking: (data: Record<string, unknown>) => http.post<{ booking: any; tenantBooking: any }>('/tenant/bookings', data),
    cancelBooking: (id: string, reason?: string) => http.post<any>(`/tenant/bookings/${id}/cancel`, { reason }),
    scheduleVisit: (data: Record<string, unknown>) => http.post<any>('/tenant/visits', data),
    payments: () => http.get<any[]>('/tenant/payments'),
    pay: (data: { amount: number; type?: string; paymentMethod?: string; bookingId?: string; idempotencyKey?: string }) => http.post<any>('/tenant/payments', data),
    documents: () => http.get<any[]>('/tenant/documents'),
    addDocument: (data: Record<string, unknown>) => http.post<any>('/tenant/documents', data),
    deleteDocument: (id: string) => http.delete<{ deleted: boolean }>(`/tenant/documents/${id}`),
    tickets: () => http.get<any[]>('/tenant/support'),
    createTicket: (data: Record<string, unknown>) => http.post<any>('/tenant/support', data),
    replyTicket: (id: string, message: string) => http.post<any>(`/tenant/support/${id}/messages`, { message }),
    resolveTicket: (id: string) => http.post<any>(`/tenant/support/${id}/resolve`),
    wishlist: () => http.get<any[]>('/tenant/wishlist'),
    saveToWishlist: (propertyId: string) => http.put<{ saved: boolean; propertyIds: string[] }>(`/tenant/wishlist/${propertyId}`),
    removeFromWishlist: (propertyId: string) => http.delete<{ saved: boolean; propertyIds: string[] }>(`/tenant/wishlist/${propertyId}`),
    clearWishlist: () => http.delete<{ cleared: boolean }>('/tenant/wishlist'),
    notifications: () => http.get<any[]>('/tenant/notifications'),
    markNotificationRead: (id: string | 'all') => http.put<{ read: boolean }>(`/tenant/notifications/${id}/read`),
  },

  admin: {
    stats: () => http.get<any>('/admin/stats'),
    users: (role?: string) => http.get<any[]>(`/admin/users${role ? `?role=${role}` : ''}`),
    setUserStatus: (id: string, status: 'active' | 'suspended') => http.put<any>(`/admin/users/${id}/status`, { status }),
    properties: () => http.get<any[]>('/admin/properties'),
    approveProperty: (id: string, options?: { isNestinVerified?: boolean; isFeatured?: boolean; isZeroBrokerage?: boolean }) => http.post<any>(`/admin/properties/${id}/approve`, options || {}),
    rejectProperty: (id: string, reason: string) => http.post<any>(`/admin/properties/${id}/reject`, { reason }),
    setBadges: (id: string, badges: { isNestinVerified?: boolean; isFeatured?: boolean; isZeroBrokerage?: boolean }) => http.patch<any>(`/admin/properties/${id}/badges`, badges),
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

  public: {
    contact: (data: Record<string, unknown>) => http.post<{ ticketNumber: string; id: string }>('/public/contact', data, { auth: false }),
    ownerDemo: (data: Record<string, unknown>) => http.post<{ id: string }>('/public/owner-demo', data, { auth: false }),
    newsletter: (email: string) => http.post<{ subscribed: boolean }>('/public/newsletter', { email }, { auth: false }),
  },

  audit: {
    getLogs: (limit = 50, eventType?: string) => http.get<any[]>(`/audit/logs?limit=${limit}${eventType ? `&eventType=${encodeURIComponent(eventType)}` : ''}`),
  },
};

export type Api = typeof ApiClient;
