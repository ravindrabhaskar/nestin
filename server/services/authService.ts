import crypto from "node:crypto";
import type { Request } from "express";
import { config } from "../config.js";
import { users, sessions, employees, roles, documents, type UserRecord, type SessionRecord } from "../db/repositories.js";
import { hashPassword, verifyPassword, validatePasswordStrength } from "../lib/password.js";
import { createJwt, hashToken, type AppRole } from "../lib/jwt.js";
import { newId } from "../lib/ids.js";
import { badRequest, conflict, forbidden, unauthorized, HttpError } from "../lib/errors.js";
import * as v from "../lib/validate.js";
import { events } from "../lib/events.js";
import { clientIp } from "../lib/rateLimit.js";
import { getAllPermissionsTrue } from "../../src/data/rbacData";

export interface PublicUser {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: AppRole;
  roles: AppRole[];
  ownerId: string | null;
  employeeId?: string;
  permissions?: Record<string, boolean>;
  authProvider: string;
  createdAt: string;
  phone?: string;
  avatar?: string;
  city?: string;
  dob?: string;
  gender?: string;
  occupation?: string;
  collegeOrCompany?: string;
  bio?: string;
  language?: string;
  livingPreferences?: object;
  notificationSettings?: object;
  privacySettings?: object;
  searchPreferences?: object;
  documents?: unknown[];
  activeSessions?: PublicSession[];
}

export interface PublicSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
  session: PublicSession;
  expiresAt: string;
}

// ---------------------------------------------------------------------------------------------

const PROFILE_FIELDS = ["phone", "avatar", "city", "dob", "gender", "occupation", "collegeOrCompany", "bio", "language"] as const;
const PROFILE_OBJECT_FIELDS = ["livingPreferences", "notificationSettings", "privacySettings", "searchPreferences"] as const;

export function toPublicUser(user: UserRecord, currentSessionId?: string, includeSessions = false): PublicUser {
  let permissions: Record<string, boolean> | undefined;
  let employeeId: string | undefined;
  if (user.role === "employee") {
    const employee = user.data.employeeId ? employees.get(user.data.employeeId) : employees.findOne({ email: user.email });
    if (employee) {
      employeeId = employee.id;
      const role = roles.get(employee.roleId);
      permissions = { ...(role?.permissions || {}), ...(employee.overrides || {}) };
    }
  } else if (user.role === "owner" || user.role === "super_admin") {
    permissions = getAllPermissionsTrue();
  }

  const ownerId = user.role === "owner" ? user.id : user.ownerId;
  const { employeeId: _ignored, ...profile } = user.data;

  return {
    id: user.id,
    name: user.fullName,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    roles: [user.role],
    ownerId,
    employeeId,
    permissions,
    authProvider: user.authProvider,
    createdAt: user.createdAt,
    ...profile,
    documents: user.role === "tenant" ? documents.list({ tenant_id: user.id }) : undefined,
    activeSessions: includeSessions ? listSessions(user.id, currentSessionId) : undefined,
  };
}

function toPublicSession(s: SessionRecord, currentSessionId?: string): PublicSession {
  const minutesAgo = Math.round((Date.now() - Date.parse(s.lastActiveAt)) / 60000);
  const lastActive = minutesAgo < 2 ? "Active Now" : minutesAgo < 60 ? `${minutesAgo} minutes ago` : minutesAgo < 1440 ? `${Math.round(minutesAgo / 60)} hours ago` : `${Math.round(minutesAgo / 1440)} days ago`;
  return { id: s.id, device: s.device, browser: s.browser, location: s.location, ip: s.ip, lastActive, createdAt: s.createdAt, isCurrent: s.id === currentSessionId };
}

export function listSessions(userId: string, currentSessionId?: string): PublicSession[] {
  return sessions.listActiveForUser(userId).map((s) => toPublicSession(s, currentSessionId));
}

function describeClient(req: Request): { device: string; browser: string; ip: string; location: string } {
  const ua = String(req.headers["user-agent"] || "");
  let device = "Desktop";
  if (/iphone|ipad|ipod/i.test(ua)) device = "iPhone / iPad";
  else if (/android/i.test(ua)) device = "Android device";
  else if (/macintosh|mac os x/i.test(ua)) device = "Mac";
  else if (/windows/i.test(ua)) device = "Windows PC";
  else if (/linux/i.test(ua)) device = "Linux";
  else if (/node|undici|curl|playwright/i.test(ua)) device = "API client";

  let browser = "Browser";
  if (/edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";
  else if (/node|undici|curl/i.test(ua)) browser = "HTTP client";

  const ip = clientIp(req);
  return { device, browser, ip, location: ip === "::1" || ip.startsWith("127.") ? "Local network" : "Unknown location" };
}

function issueSession(user: UserRecord, req: Request): AuthResult {
  const sessionId = newId("sess");
  const expiresAt = new Date(Date.now() + config.jwtTtlSeconds * 1000).toISOString();
  const token = createJwt({ sub: user.id, email: user.email, role: user.role, ownerId: user.role === "owner" ? user.id : user.ownerId || undefined, sid: sessionId });
  const client = describeClient(req);
  const session = sessions.insert({ id: sessionId, userId: user.id, tokenHash: hashToken(token), ...client, expiresAt });
  return { user: toPublicUser(user, sessionId, true), token, session: toPublicSession(session, sessionId), expiresAt };
}

// ---------------------------------------------------------------------------------------------
// Public operations
// ---------------------------------------------------------------------------------------------

export function register(body: Record<string, unknown>, req: Request): AuthResult {
  const email = v.email(body.email);
  const fullName = v.str(body.fullName, "Full name", { max: 120, min: 2 });
  const role = v.oneOf(body.role, ["tenant", "owner"] as const, "Role", "tenant"); // staff & admins are never self-registered
  const phone = v.phone(body.phone, "Phone", false);
  const city = v.optionalStr(body.city, "City", 80);
  const passwordError = validatePasswordStrength(body.password);
  if (passwordError) throw badRequest(passwordError);

  if (users.findByEmail(email)) throw conflict("An account with this email address already exists. Please log in instead.");

  const user = users.insert({
    id: newId(role === "owner" ? "own" : "usr"),
    email,
    passwordHash: hashPassword(body.password as string),
    role,
    ownerId: null,
    fullName,
    status: "active",
    authProvider: "email",
    data: { phone: phone || undefined, city, avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}` },
  });

  events.publish("UserRegistered", "User", user.id, { email: user.email, role: user.role }, { actorId: user.id, actorRole: user.role, ownerId: role === "owner" ? user.id : undefined });
  return issueSession(user, req);
}

export function login(body: Record<string, unknown>, req: Request): AuthResult {
  const email = v.email(body.email);
  const password = v.str(body.password, "Password", { max: 128 });
  const user = users.findByEmail(email);

  // Constant-time-ish behaviour: always run a hash comparison even when the user is unknown.
  const ok = user ? verifyPassword(password, user.passwordHash) : verifyPassword(password, DUMMY_HASH) && false;
  if (!user || !ok) {
    events.publish("LoginFailed", "User", email, { reason: user ? "bad_password" : "unknown_email" }, { actorRole: "anonymous" });
    throw unauthorized("Invalid email or password. Please double-check your credentials.");
  }
  if (user.status !== "active") throw forbidden("This account has been suspended. Please contact support.");
  if (user.role === "super_admin") throw forbidden("Super administrators must sign in through the admin console.");
  if (user.role === "employee") assertEmployeeActive(user);

  events.publish("UserLoggedIn", "User", user.id, { role: user.role }, { actorId: user.id, actorRole: user.role, ownerId: user.role === "owner" ? user.id : user.ownerId || undefined });
  return issueSession(user, req);
}

const DUMMY_HASH = hashPassword("dummy-password-for-timing");

function assertEmployeeActive(user: UserRecord): void {
  const employee = user.data.employeeId ? employees.get(user.data.employeeId) : employees.findOne({ email: user.email });
  if (!employee || employee.status !== "active") throw forbidden("Your staff account is inactive. Please contact your property owner.");
}

export function loginSuperAdmin(body: Record<string, unknown>, req: Request): AuthResult {
  const email = v.email(body.email);
  const password = v.str(body.password, "Password", { max: 128 });
  const accessCode = v.str(body.accessCode, "Access code", { max: 128 });
  const user = users.findByEmail(email);

  const codeMatches = config.superAdmin.accessCode.length > 0 && safeEqual(accessCode, config.superAdmin.accessCode);
  const ok = !!user && user.role === "super_admin" && user.status === "active" && verifyPassword(password, user.passwordHash) && codeMatches;
  if (!ok) {
    events.publish("AdminLoginFailed", "User", email, {}, { actorRole: "anonymous" });
    throw unauthorized("Administrator authentication failed. Check the email, password and access code.");
  }
  events.publish("AdminLoggedIn", "User", user!.id, {}, { actorId: user!.id, actorRole: "super_admin" });
  return issueSession(user!, req);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

interface GoogleTokenInfo {
  aud: string;
  email: string;
  email_verified: string | boolean;
  name?: string;
  picture?: string;
  exp: string;
}

/** Verifies a Google ID token via Google's tokeninfo endpoint, then signs the user in (creating the account on first use). */
export async function loginWithGoogle(body: Record<string, unknown>, req: Request): Promise<AuthResult> {
  if (!config.google.clientId) {
    throw new HttpError(503, "GOOGLE_NOT_CONFIGURED", "Google Sign-In is not configured on this server. Set GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID.");
  }
  const credential = v.str(body.credential, "Google credential", { max: 4096 });
  const requestedRole = v.oneOf(body.role, ["tenant", "owner"] as const, "Role", "tenant");

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) throw unauthorized("Google could not verify this sign-in. Please try again.");
  const info = (await response.json()) as GoogleTokenInfo;
  if (info.aud !== config.google.clientId) throw unauthorized("Google token was issued for a different application.");
  if (String(info.email_verified) !== "true") throw unauthorized("Your Google email address is not verified.");
  if (Number(info.exp) * 1000 < Date.now()) throw unauthorized("Google token has expired.");

  const email = info.email.toLowerCase();
  let user = users.findByEmail(email);
  if (!user) {
    const fullName = info.name || email.split("@")[0];
    user = users.insert({
      id: newId(requestedRole === "owner" ? "own" : "usr"),
      email,
      passwordHash: null,
      role: requestedRole,
      ownerId: null,
      fullName,
      status: "active",
      authProvider: "google",
      data: { avatar: info.picture },
    });
    events.publish("UserRegistered", "User", user.id, { email, role: user.role, provider: "google" }, { actorId: user.id, actorRole: user.role });
  } else {
    if (user.status !== "active") throw forbidden("This account has been suspended.");
    if (user.role === "super_admin") throw forbidden("Super administrators must sign in through the admin console.");
    if (user.role === "employee") assertEmployeeActive(user);
    if (!user.data.avatar && info.picture) user = users.update(user.id, { data: { ...user.data, avatar: info.picture } }) || user;
  }
  events.publish("UserLoggedIn", "User", user.id, { role: user.role, provider: "google" }, { actorId: user.id, actorRole: user.role });
  return issueSession(user, req);
}

export function getMe(userId: string, sessionId: string): PublicUser {
  const user = users.findById(userId);
  if (!user) throw unauthorized();
  return toPublicUser(user, sessionId, true);
}

/** Whitelisted profile update. Role, email, ownerId and password can never be changed here. */
export function updateProfile(userId: string, sessionId: string, body: Record<string, unknown>): PublicUser {
  const user = users.findById(userId);
  if (!user) throw unauthorized();

  const data = { ...user.data };
  for (const field of PROFILE_FIELDS) {
    if (body[field] !== undefined) data[field] = v.optionalStr(body[field], field, field === "bio" ? 1000 : 200);
  }
  for (const field of PROFILE_OBJECT_FIELDS) {
    if (body[field] !== undefined) data[field] = v.obj(body[field], field);
  }
  const fullName = body.fullName !== undefined ? v.str(body.fullName, "Full name", { max: 120, min: 2 }) : body.name !== undefined ? v.str(body.name, "Full name", { max: 120, min: 2 }) : user.fullName;
  v.assertDocumentSize(data, 64 * 1024);

  const updated = users.update(userId, { fullName, data })!;
  events.publish("ProfileUpdated", "User", userId, { fields: Object.keys(body) }, { actorId: userId, actorRole: user.role });
  return toPublicUser(updated, sessionId, true);
}

export function changePassword(userId: string, sessionId: string, body: Record<string, unknown>): void {
  const user = users.findById(userId);
  if (!user) throw unauthorized();
  const current = v.str(body.currentPassword, "Current password", { max: 128, required: !!user.passwordHash });
  const passwordError = validatePasswordStrength(body.newPassword);
  if (passwordError) throw badRequest(passwordError);
  if (user.passwordHash && !verifyPassword(current, user.passwordHash)) throw unauthorized("Current password is incorrect.");
  users.update(userId, { passwordHash: hashPassword(body.newPassword as string) });
  sessions.revokeAllForUser(userId, sessionId); // sign out every other device
  events.publish("PasswordChanged", "User", userId, {}, { actorId: userId, actorRole: user.role });
}

export function revokeSession(userId: string, sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new HttpError(404, "NOT_FOUND", "Session not found");
  sessions.revoke(sessionId);
  events.publish("SessionRevoked", "Session", sessionId, {}, { actorId: userId });
}

export function logout(userId: string, sessionId: string): void {
  sessions.revoke(sessionId);
  events.publish("UserLoggedOut", "User", userId, { sessionId }, { actorId: userId });
}

export function deleteAccount(userId: string, body: Record<string, unknown>): void {
  const user = users.findById(userId);
  if (!user) throw unauthorized();
  if (user.role === "super_admin") throw forbidden("Super administrator accounts cannot be deleted from the app.");
  if (user.passwordHash) {
    const password = v.str(body.password, "Password", { max: 128 });
    if (!verifyPassword(password, user.passwordHash)) throw unauthorized("Password is incorrect.");
  }
  sessions.revokeAllForUser(userId);
  users.update(userId, { status: "suspended", email: `deleted-${Date.now()}-${user.email}`, passwordHash: null, data: {} });
  events.publish("AccountDeleted", "User", userId, {}, { actorId: userId, actorRole: user.role });
}
