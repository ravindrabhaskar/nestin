import { Router } from "express";
import * as admin from "../services/adminService.js";
import * as props from "../services/propertyService.js";
import { authenticate, requireRole, currentUser, type AuthedRequest } from "../middleware/auth.js";
import { sendOk, wrap } from "../middleware/common.js";

export const adminRouter = Router();

const ctx = (req: AuthedRequest) => ({ correlationId: req.correlationId });

adminRouter.use(authenticate, requireRole("super_admin"));

adminRouter.get("/stats", wrap((_req, res) => sendOk(res, admin.stats())));
adminRouter.get("/users", wrap((req, res) => sendOk(res, admin.listUsers(typeof req.query.role === "string" ? { role: req.query.role as never } : {}))));
adminRouter.put("/users/:id/status", wrap((req, res) => sendOk(res, admin.setUserStatus(currentUser(req), req.params.id, req.body?.status === "suspended" ? "suspended" : "active", ctx(req)))));

adminRouter.get("/properties", wrap((_req, res) => sendOk(res, props.listAll())));
adminRouter.post("/properties/:id/approve", wrap((req, res) => sendOk(res, props.adminApprove(currentUser(req), req.params.id, req.body || {}, ctx(req)))));
adminRouter.post("/properties/:id/reject", wrap((req, res) => sendOk(res, props.adminReject(currentUser(req), req.params.id, String(req.body?.reason || ""), ctx(req)))));
adminRouter.patch("/properties/:id/badges", wrap((req, res) => sendOk(res, props.adminSetBadges(currentUser(req), req.params.id, req.body || {}, ctx(req)))));

adminRouter.get("/bookings", wrap((_req, res) => sendOk(res, admin.listAllBookings())));
adminRouter.get("/inbound", wrap((req, res) => sendOk(res, admin.listInbound(typeof req.query.kind === "string" ? (req.query.kind as never) : undefined))));
adminRouter.put("/inbound/:id", wrap((req, res) => sendOk(res, admin.updateInbound(currentUser(req), req.params.id, req.body?.status, ctx(req)))));
adminRouter.get("/audit", wrap((req, res) => sendOk(res, admin.auditLog({
  ownerId: typeof req.query.ownerId === "string" ? req.query.ownerId : undefined,
  type: typeof req.query.type === "string" ? req.query.type : undefined,
  limit: req.query.limit ? Math.min(1000, Number(req.query.limit)) : 200,
}))));
