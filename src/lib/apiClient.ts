// Nestin Frontend Microservices API Client
const API_BASE = "/api/v1";

interface RequestOptions extends RequestInit {
  token?: string;
}

export class ApiClient {
  private static getHeaders(options: RequestOptions = {}): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Correlation-Id": `req-fe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...(options.headers as Record<string, string>),
    };

    // Attach Bearer token from options or localStorage session
    const token = options.token || localStorage.getItem("nestin_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private static async handleResponse<T>(res: Response): Promise<T> {
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      const errorMsg = data.error?.message || `HTTP Error ${res.status}: ${res.statusText}`;
      const err = new Error(errorMsg) as any;
      err.code = data.error?.code || `ERR_${res.status}`;
      err.status = res.status;
      err.details = data.error?.details;
      throw err;
    }
    return data.data !== undefined ? data.data : data;
  }

  // Generic HTTP methods
  static async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: this.getHeaders(options),
      ...options,
    });
    return this.handleResponse<T>(res);
  }

  static async post<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: this.getHeaders(options),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    });
    return this.handleResponse<T>(res);
  }

  static async put<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: this.getHeaders(options),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    });
    return this.handleResponse<T>(res);
  }

  static async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: this.getHeaders(options),
      ...options,
    });
    return this.handleResponse<T>(res);
  }

  // --- SERVICE-SPECIFIC ENDPOINTS ---

  // Auth Service (Independent Auth Service REST API)
  static auth = {
    login: (credentials: string | { email: string; password?: string; role?: string }, role?: string) => {
      const payload = typeof credentials === "string" ? { email: credentials, role } : credentials;
      return this.post<any>("/auth/login", payload);
    },
    register: (data: any) => this.post<any>("/auth/register", data),
    google: (data: any) => this.post<any>("/auth/google", data),
    validateToken: (token?: string) => {
      const options = token ? { token, headers: { Authorization: `Bearer ${token}` } } : undefined;
      return this.post<any>("/auth/validate-token", { token }, options);
    },
    me: () => this.get<any>("/auth/me"),
    getProfile: () => this.get<any>("/auth/profile"),
    updateProfile: (data: any) => this.put<any>("/auth/profile", data),
    getSessions: () => this.get<any[]>("/auth/sessions"),
    revokeSession: (sessionId: string) => this.delete<any>(`/auth/sessions/${sessionId}`),
    logout: () => this.post<any>("/auth/logout"),
  };

  // Property Service
  static properties = {
    search: (params?: Record<string, any>) => {
      const query = params ? "?" + new URLSearchParams(params).toString() : "";
      return this.get<any[]>(`/properties${query}`);
    },
    getById: (id: string) => this.get<any>(`/properties/${id}`),
    getMyListings: () => this.get<any[]>("/properties/owner/my-listings"),
    create: (data: any) => this.post<any>("/properties", data),
    update: (id: string, data: any) => this.put<any>(`/properties/${id}`, data),
    delete: (id: string) => this.delete<any>(`/properties/${id}`),
  };

  // Inventory Service
  static inventory = {
    getRooms: (propertyId: string) => this.get<any[]>(`/inventory/property/${propertyId}/rooms`),
    checkAvailability: (propertyId: string) => this.get<any>(`/inventory/property/${propertyId}/check-availability`),
    addRoom: (propertyId: string, data: any) => this.post<any>(`/inventory/property/${propertyId}/rooms`, data),
  };

  // Booking Service
  static bookings = {
    getMyBookings: () => this.get<any[]>("/bookings/my-bookings"),
    getOwnerBookings: () => this.get<any[]>("/bookings/owner/all"),
    create: (data: any) => this.post<any>("/bookings", data),
    cancel: (id: string) => this.post<any>(`/bookings/${id}/cancel`),
  };

  // CRM Service
  static crm = {
    getLeads: () => this.get<any[]>("/crm/leads"),
    createLead: (data: any) => this.post<any>("/crm/leads", data),
    updateLead: (id: string, data: any) => this.put<any>(`/crm/leads/${id}`, data),
    getVisitors: () => this.get<any[]>("/crm/visitors"),
    createVisitor: (data: any) => this.post<any>("/crm/visitors", data),
    getCustomers: () => this.get<any[]>("/crm/customers"),
  };

  // Tenant Service
  static tenant = {
    getProfile: () => this.get<any>("/tenants/me"),
    updateProfile: (data: any) => this.put<any>("/tenants/me", data),
    toggleSaved: (propertyId: string) => this.post<any>(`/tenants/saved/${propertyId}`),
  };

  // Payment Service
  static payments = {
    getMyPayments: () => this.get<any[]>("/payments/my-payments"),
    getOwnerPayments: () => this.get<any[]>("/payments/owner/all"),
    checkout: (data: any) => this.post<any>("/payments/checkout", data),
  };

  // Subscription Service
  static subscription = {
    getMyPlan: () => this.get<any>("/subscriptions/my-plan"),
    upgrade: (planId: string) => this.post<any>("/subscriptions/upgrade", { planId }),
  };

  // Document Service
  static documents = {
    getMyDocuments: () => this.get<any[]>("/documents/my-documents"),
    getOwnerDocuments: () => this.get<any[]>("/documents/owner/all"),
    upload: (data: any) => this.post<any>("/documents/upload", data),
  };

  // Notification Service
  static notifications = {
    getMyNotifications: () => this.get<any[]>("/notifications/my-notifications"),
    markAsRead: (id: string) => this.put<any>(`/notifications/${id}/read`),
  };

  // RBAC Service
  static rbac = {
    getRoles: () => this.get<any[]>("/rbac/roles"),
    getEmployees: () => this.get<any[]>("/rbac/employees"),
    createEmployee: (data: any) => this.post<any>("/rbac/employees", data),
    updateRolePermissions: (roleId: string, permissions: string[]) =>
      this.put<any>(`/rbac/roles/${roleId}/permissions`, { permissions }),
  };

  // Audit Service
  static audit = {
    getLogs: (limit = 50, eventType?: string) => {
      const query = `?limit=${limit}${eventType ? `&eventType=${eventType}` : ""}`;
      return this.get<any[]>(`/audit/logs${query}`);
    },
  };

  // Central Health
  static getHealth: () => Promise<any> = () => this.get<any>("/health");
}
