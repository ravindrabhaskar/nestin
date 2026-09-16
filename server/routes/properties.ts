import { Router } from "express";
import * as props from "../services/propertyService.js";
import { authenticate, optionalAuth, requireRole, requirePermission, ownerScope, currentUser } from "../middleware/auth.js";
import { sendOk, wrap } from "../middleware/common.js";
import { INDIAN_CITIES_DATA } from "../../src/data/citiesData";

export const propertiesRouter = Router();

const ctx = (req: Parameters<typeof currentUser>[0]) => ({ correlationId: req.correlationId });

// ---- Public marketplace ----------------------------------------------------------------------

propertiesRouter.get("/public", wrap((req, res) => {
  const list = props.listPublished({
    city: typeof req.query.city === "string" ? req.query.city : undefined,
    query: typeof req.query.q === "string" ? req.query.q : undefined,
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    maxRent: req.query.maxRent ? Number(req.query.maxRent) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  sendOk(res, list, 200, { total: list.length });
}));

propertiesRouter.get("/public/cities", (_req, res) => {
  sendOk(res, INDIAN_CITIES_DATA);
});

propertiesRouter.get("/public/:slug", optionalAuth, wrap((req, res) => {
  const listing = props.getPublicBySlugOrId(req.params.slug, req.user);
  if (!req.user || (req.user.role === "tenant")) props.recordView(listing.id);
  sendOk(res, listing);
}));

propertiesRouter.post("/public/:id/reviews", authenticate, requireRole("tenant"), wrap((req, res) => {
  sendOk(res, props.addReview(currentUser(req), req.params.id, req.body || {}, ctx(req)), 201);
}));

// ---- Owner portal ---------------------------------------------------------------------------

propertiesRouter.get("/owner", authenticate, requireRole("owner", "employee", "super_admin"), requirePermission("properties.view"), wrap((req, res) => {
  sendOk(res, props.listForOwner(ownerScope(req)));
}));

propertiesRouter.post("/owner", authenticate, requireRole("owner", "employee"), requirePermission("properties.create"), wrap((req, res) => {
  sendOk(res, props.create(currentUser(req), ownerScope(req), req.body || {}, ctx(req)), 201);
}));

propertiesRouter.put("/owner/:id", authenticate, requireRole("owner", "employee"), requirePermission("properties.edit"), wrap((req, res) => {
  sendOk(res, props.update(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)));
}));

propertiesRouter.delete("/owner/:id", authenticate, requireRole("owner", "employee"), requirePermission("properties.delete"), wrap((req, res) => {
  props.remove(currentUser(req), ownerScope(req), req.params.id, ctx(req));
  sendOk(res, { deleted: true, id: req.params.id });
}));

propertiesRouter.post("/owner/:id/submit", authenticate, requireRole("owner", "employee"), requirePermission("properties.publish"), wrap((req, res) => {
  sendOk(res, props.submitForVerification(currentUser(req), ownerScope(req), req.params.id, ctx(req)));
}));

propertiesRouter.patch("/owner/:id/beds", authenticate, requireRole("owner", "employee"), requirePermission("vacancies.manage"), wrap((req, res) => {
  sendOk(res, props.updateBedStatus(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)));
}));
