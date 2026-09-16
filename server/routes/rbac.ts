import { Router } from "express";
import * as rbac from "../services/rbacService.js";
import { authenticate, requireRole, requirePermission, ownerScope, currentUser, type AuthedRequest } from "../middleware/auth.js";
import { sendOk, wrap } from "../middleware/common.js";

export const rbacRouter = Router();

const ctx = (req: AuthedRequest) => ({ correlationId: req.correlationId });

rbacRouter.use(authenticate, requireRole("owner", "employee", "super_admin"));

rbacRouter.get("/catalog", (_req, res) => sendOk(res, rbac.permissionCatalog()));
rbacRouter.get("/snapshot", wrap((req, res) => sendOk(res, rbac.snapshot(ownerScope(req)))));

rbacRouter.post("/roles", requirePermission("roles.manage"), wrap((req, res) => sendOk(res, rbac.upsertRole(currentUser(req), ownerScope(req), undefined, req.body || {}, ctx(req)), 201)));
rbacRouter.put("/roles/:id", requirePermission("roles.manage"), wrap((req, res) => sendOk(res, rbac.upsertRole(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)))));
rbacRouter.delete("/roles/:id", requirePermission("roles.manage"), wrap((req, res) => {
  rbac.deleteRole(currentUser(req), ownerScope(req), req.params.id, ctx(req));
  sendOk(res, { deleted: true, id: req.params.id });
}));

rbacRouter.post("/employees", requirePermission("employees.create"), wrap((req, res) => sendOk(res, rbac.upsertEmployee(currentUser(req), ownerScope(req), undefined, req.body || {}, ctx(req)), 201)));
rbacRouter.put("/employees/:id", requirePermission("employees.edit"), wrap((req, res) => sendOk(res, rbac.upsertEmployee(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)))));
rbacRouter.post("/employees/:id/reset-password", requirePermission("employees.edit"), wrap((req, res) => sendOk(res, rbac.resetEmployeePassword(currentUser(req), ownerScope(req), req.params.id, ctx(req)))));
rbacRouter.delete("/employees/:id", requirePermission("employees.deactivate"), wrap((req, res) => {
  rbac.deleteEmployee(currentUser(req), ownerScope(req), req.params.id, ctx(req));
  sendOk(res, { deleted: true, id: req.params.id });
}));

rbacRouter.post("/audit", wrap((req, res) => sendOk(res, rbac.recordAudit(ownerScope(req), req.body || {}, currentUser(req)), 201)));
