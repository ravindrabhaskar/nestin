import { Router } from 'express';
import * as props from '../services/propertyService.js';
import {
  authenticate,
  optionalAuth,
  requireRole,
  requirePermission,
  ownerScope,
  currentUser,
} from '../middleware/auth.js';
import { sendOk, wrap } from '../middleware/common.js';
import { INDIAN_CITIES_DATA } from '../../src/data/citiesData';
import * as admin from '../services/adminService.js';
import { properties } from '../db/repositories.js';

export const propertiesRouter = Router();

const ctx = (req: Parameters<typeof currentUser>[0]) => ({ correlationId: req.correlationId });

// ---- Public marketplace ----------------------------------------------------------------------

const qs = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const qn = (value: unknown) =>
  value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined;

/**
 * Public catalogue. Without `page` it behaves as before (one array, up to `limit`/500 results) so
 * the marketplace can compute facets client-side; with `page`/`pageSize` it paginates in SQL and
 * reports `total`/`totalPages` in the response metadata.
 */
propertiesRouter.get(
  '/public',
  wrap((req, res) => {
    const paged = req.query.page !== undefined || req.query.pageSize !== undefined;
    const sort = qs(req.query.sort);
    const result = props.searchPublished({
      city: qs(req.query.city),
      area: qs(req.query.area),
      query: qs(req.query.q),
      category: qs(req.query.category),
      type: qs(req.query.type),
      minRent: qn(req.query.minRent),
      maxRent: qn(req.query.maxRent),
      verifiedOnly: req.query.verified === 'true',
      availableOnly: req.query.available === 'true',
      sort:
        sort && sort in { relevance: 1, rent_asc: 1, rent_desc: 1, rating: 1, newest: 1 } ? (sort as never) : undefined,
      page: paged ? qn(req.query.page) || 1 : 1,
      pageSize: paged ? qn(req.query.pageSize) || 24 : Math.min(500, qn(req.query.limit) || 500),
    });
    res.setHeader('Cache-Control', 'public, max-age=30');
    sendOk(res, result.items, 200, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  })
);

/**
 * City directory: static editorial content (images, landmarks) merged with live inventory numbers.
 * Fabricated counts in the seed file are never sent — a city with no listings says so.
 */
propertiesRouter.get('/public/cities', (_req, res) => {
  const live = new Map(admin.publicStats().citiesBreakdown.map((c) => [c.city.toLowerCase(), c]));
  const published = properties.list({ status: 'published' });
  const enriched = INDIAN_CITIES_DATA.map((city) => {
    const stats = live.get(city.name.toLowerCase());
    const inCity = published.filter((p) => p.location?.city?.toLowerCase() === city.name.toLowerCase());
    const beds = inCity.reduce((n, p) => n + (p.rooms || []).reduce((m, r) => m + (r.capacity || 0), 0), 0);
    const freeBeds = inCity.reduce(
      (n, p) => n + (p.rooms || []).reduce((m, r) => m + (r.availableBedsCount || 0), 0),
      0
    );
    const listings = stats?.listings || 0;
    return {
      ...city,
      liveListings: listings,
      verifiedCount: inCity.filter((p) => p.isNestinVerified).length,
      stays: listings ? `${listings} ${listings === 1 ? 'stay' : 'stays'}` : 'Launching soon',
      startingRent: stats?.minRent ?? undefined,
      avgPrice: stats?.minRent ? `from ₹${stats.minRent.toLocaleString('en-IN')}/mo` : undefined,
      availableBeds: freeBeds,
      occupancyRate: beds ? Math.round(((beds - freeBeds) / beds) * 100) : undefined,
    };
  });
  res.setHeader('Cache-Control', 'public, max-age=60');
  sendOk(res, enriched);
});

propertiesRouter.get(
  '/public/:slug',
  optionalAuth,
  wrap((req, res) => {
    const listing = props.getPublicBySlugOrId(req.params.slug, req.user);
    if (!req.user || req.user.role === 'tenant') props.recordView(listing.id);
    sendOk(res, listing);
  })
);

propertiesRouter.post(
  '/public/:id/reviews',
  authenticate,
  requireRole('tenant'),
  wrap((req, res) => {
    sendOk(res, props.addReview(currentUser(req), req.params.id, req.body || {}, ctx(req)), 201);
  })
);

// ---- Owner portal ---------------------------------------------------------------------------

propertiesRouter.get(
  '/owner',
  authenticate,
  requireRole('owner', 'employee', 'super_admin'),
  requirePermission('properties.view'),
  wrap((req, res) => {
    sendOk(res, props.listForOwner(ownerScope(req)));
  })
);

propertiesRouter.post(
  '/owner',
  authenticate,
  requireRole('owner', 'employee'),
  requirePermission('properties.create'),
  wrap((req, res) => {
    sendOk(res, props.create(currentUser(req), ownerScope(req), req.body || {}, ctx(req)), 201);
  })
);

propertiesRouter.put(
  '/owner/:id',
  authenticate,
  requireRole('owner', 'employee'),
  requirePermission('properties.edit'),
  wrap((req, res) => {
    sendOk(res, props.update(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)));
  })
);

propertiesRouter.delete(
  '/owner/:id',
  authenticate,
  requireRole('owner', 'employee'),
  requirePermission('properties.delete'),
  wrap((req, res) => {
    props.remove(currentUser(req), ownerScope(req), req.params.id, ctx(req));
    sendOk(res, { deleted: true, id: req.params.id });
  })
);

propertiesRouter.post(
  '/owner/:id/submit',
  authenticate,
  requireRole('owner', 'employee'),
  requirePermission('properties.publish'),
  wrap((req, res) => {
    sendOk(res, props.submitForVerification(currentUser(req), ownerScope(req), req.params.id, ctx(req)));
  })
);

propertiesRouter.patch(
  '/owner/:id/beds',
  authenticate,
  requireRole('owner', 'employee'),
  requirePermission('vacancies.manage'),
  wrap((req, res) => {
    sendOk(res, props.updateBedStatus(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)));
  })
);
