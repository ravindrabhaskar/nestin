import type { Server } from "node:http";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-test-secret-test-secret-1234567890";

/** Boots the API on an ephemeral port with a fresh in-memory database. */
export async function startTestServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const { resetDbForTests } = await import("../../server/db/database.js");
  resetDbForTests();
  const { createApp } = await import("../../server/app.js");
  const app = await createApp({ serveFrontend: false });
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    baseUrl: `http://127.0.0.1:${port}/api/v1`,
    close: () =>
      new Promise((resolve) => {
        server.close(() => {
          resetDbForTests();
          resolve();
        });
      }),
  };
}

export interface ApiResponse<T = any> {
  status: number;
  success: boolean;
  data: T;
  error?: { code: string; message: string; details?: unknown };
}

export function client(baseUrl: string) {
  const call = async <T = any>(method: string, path: string, body?: unknown, token?: string): Promise<ApiResponse<T>> => {
    const res = await fetch(baseUrl + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as Omit<ApiResponse<T>, "status">;
    return { status: res.status, ...json };
  };
  return {
    get: <T = any>(path: string, token?: string) => call<T>("GET", path, undefined, token),
    post: <T = any>(path: string, body?: unknown, token?: string) => call<T>("POST", path, body ?? {}, token),
    put: <T = any>(path: string, body?: unknown, token?: string) => call<T>("PUT", path, body ?? {}, token),
    patch: <T = any>(path: string, body?: unknown, token?: string) => call<T>("PATCH", path, body ?? {}, token),
    delete: <T = any>(path: string, token?: string, body?: unknown) => call<T>("DELETE", path, body, token),
  };
}

export const DEMO = {
  password: "NestIn@2026",
  owner: "owner@nestin.com",
  tenant: "tenant@nestin.com",
  staff: "staff@nestin.com",
  admin: { email: "admin@nestin.io", password: "Admin@NestIn2026", accessCode: "NESTIN-SUPER-ADMIN-2026" },
};

export async function login(api: ReturnType<typeof client>, email: string, password = DEMO.password): Promise<string> {
  const res = await api.post("/auth/login", { email, password });
  if (!res.success) throw new Error(`login failed for ${email}: ${res.error?.message}`);
  return res.data.token as string;
}

export async function adminLogin(api: ReturnType<typeof client>): Promise<string> {
  const res = await api.post("/auth/admin/login", DEMO.admin);
  if (!res.success) throw new Error(`admin login failed: ${res.error?.message}`);
  return res.data.token as string;
}
