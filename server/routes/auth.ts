import { Router } from "express";
import * as auth from "../services/authService.js";
import { authenticate, currentUser } from "../middleware/auth.js";
import { sendOk, wrap } from "../middleware/common.js";
import { rateLimit } from "../lib/rateLimit.js";
import { config } from "../config.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  name: "auth",
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMaxAttempts,
  keyFn: (req) => String((req.body && req.body.email) || "").toLowerCase(),
});

authRouter.get("/config", (_req, res) => {
  sendOk(res, { googleClientId: config.google.clientId || null, demoMode: config.seedDemoData && !config.isProduction });
});

authRouter.post("/register", loginLimiter, wrap((req, res) => sendOk(res, auth.register(req.body || {}, req), 201)));
authRouter.post("/login", loginLimiter, wrap((req, res) => sendOk(res, auth.login(req.body || {}, req))));
authRouter.post("/admin/login", loginLimiter, wrap((req, res) => sendOk(res, auth.loginSuperAdmin(req.body || {}, req))));
authRouter.post("/google", loginLimiter, wrap(async (req, res) => sendOk(res, await auth.loginWithGoogle(req.body || {}, req))));

authRouter.post("/validate-token", authenticate, wrap((req, res) => {
  const user = currentUser(req);
  sendOk(res, { valid: true, user: auth.getMe(user.id, user.sessionId) });
}));

authRouter.get("/me", authenticate, wrap((req, res) => {
  const user = currentUser(req);
  sendOk(res, auth.getMe(user.id, user.sessionId));
}));

authRouter.put("/profile", authenticate, wrap((req, res) => {
  const user = currentUser(req);
  sendOk(res, auth.updateProfile(user.id, user.sessionId, req.body || {}));
}));

authRouter.post("/change-password", authenticate, wrap((req, res) => {
  const user = currentUser(req);
  auth.changePassword(user.id, user.sessionId, req.body || {});
  sendOk(res, { changed: true });
}));

authRouter.get("/sessions", authenticate, wrap((req, res) => {
  const user = currentUser(req);
  sendOk(res, auth.listSessions(user.id, user.sessionId));
}));

authRouter.delete("/sessions/:id", authenticate, wrap((req, res) => {
  const user = currentUser(req);
  auth.revokeSession(user.id, req.params.id);
  sendOk(res, { revoked: true, sessionId: req.params.id });
}));

authRouter.post("/logout", authenticate, wrap((req, res) => {
  const user = currentUser(req);
  auth.logout(user.id, user.sessionId);
  sendOk(res, { loggedOut: true });
}));

authRouter.delete("/account", authenticate, wrap((req, res) => {
  const user = currentUser(req);
  auth.deleteAccount(user.id, req.body || {});
  sendOk(res, { deleted: true });
}));
