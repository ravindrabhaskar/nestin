import {
  VERIFICATION_CHECKLIST,
  type OwnerPropertyListing,
  type PropertyResidentReview,
  type PropertyRoom,
  type VerificationCheckId,
} from '../../src/types/property';
import { config } from '../config.js';
import { getMeta, setMeta } from '../db/database.js';
import { fulfilVerificationOrder } from './monetisationService.js';
import { calculatePropertyCompleteness } from '../../src/lib/domain/propertyCompleteness';
import { properties, users, bookings } from '../db/repositories.js';
import { Collection, getDb } from '../db/database.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { isSafeId, newId, slugify } from '../lib/ids.js';
import * as v from '../lib/validate.js';
import { events, type EventContext } from '../lib/events.js';
import type { AuthUser } from '../middleware/auth.js';
import { assertCanAddProperty } from './billingService.js';

const PROPERTY_TYPES = ['PG', 'Hostel', 'Co-living', 'Student Housing', 'Working Professionals'] as const;
const CATEGORIES = ['Men', 'Women', 'Co-ed'] as const;

/** Fields only the platform (super admin) or workflows may change. */
const SYSTEM_CONTROLLED = [
  'summary',
  'id',
  'ownerId',
  'ownerName',
  'ownerEmail',
  'isNestinVerified',
  'isFeatured',
  'isZeroBrokerage',
  'systemMetrics',
  'reviews',
  'rejectionReason',
  'completenessScore',
  'status',
  'verification',
];

function nowIso() {
  return new Date().toISOString();
}

/** Accepts an uploaded mp4/webm from our storage or a YouTube watch/short URL; anything else is dropped. */
export function sanitizeTourVideo(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const url = value.trim().slice(0, 500);
  if (/^(\/api\/v1\/files\/|\/uploads\/)/.test(url) && /\.(mp4|webm)(\?|$)/i.test(url)) return url;
  const yt = url.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  if (/^https:\/\/.+\.(mp4|webm)(\?|$)/i.test(url)) return url;
  return undefined;
}

export interface PublicPropertyFilters {
  city?: string;
  area?: string;
  query?: string;
  minRent?: number;
  maxRent?: number;
  category?: string;
  type?: string;
  verifiedOnly?: boolean;
  availableOnly?: boolean;
  /** Listings with meals included/optional. */
  foodOnly?: boolean;
  /** Any of: single | double | triple | four | dormitory. */
  roomTypes?: string[];
  /** All must be present (case-insensitive amenity names). */
  amenities?: string[];
  minRating?: number;
  /** Centre + radius for "near me"; enables the `nearest` sort. */
  near?: { lat: number; lng: number; radiusKm?: number };
  sort?: 'relevance' | 'rent_asc' | 'rent_desc' | 'rating' | 'newest' | 'nearest';
  limit?: number;
  page?: number;
  pageSize?: number;
}

const ROOM_TYPE_KEYS = ['single', 'double', 'triple', 'four', 'dormitory'];

export interface PublicCatalogueResult {
  items: OwnerPropertyListing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const SORTS: Record<Exclude<NonNullable<PublicPropertyFilters['sort']>, 'nearest'>, string> = {
  relevance: 'is_featured DESC, is_verified DESC, rating DESC, created_at DESC',
  rent_asc: 'min_rent ASC, rating DESC',
  rent_desc: 'min_rent DESC, rating DESC',
  rating: 'rating DESC, is_verified DESC',
  newest: 'created_at DESC',
};

/**
 * Catalogue query executed in SQL over the indexed columns, so it stays fast well beyond the
 * point where scanning every JSON document would not. Returns card projections.
 */
export function searchPublished(filters: PublicPropertyFilters = {}): PublicCatalogueResult {
  const where: string[] = ["status = 'published'"];
  const params: Array<string | number> = [];
  if (filters.city) {
    where.push('LOWER(city) = ?');
    params.push(filters.city.toLowerCase());
  }
  if (filters.area) {
    where.push('LOWER(area) LIKE ?');
    params.push(`%${filters.area.toLowerCase()}%`);
  }
  if (filters.category && CATEGORIES.includes(filters.category as (typeof CATEGORIES)[number])) {
    where.push('category = ?');
    params.push(filters.category);
  }
  if (filters.type && PROPERTY_TYPES.includes(filters.type as (typeof PROPERTY_TYPES)[number])) {
    where.push('type = ?');
    params.push(filters.type);
  }
  if (filters.minRent) {
    where.push('min_rent >= ?');
    params.push(filters.minRent);
  }
  if (filters.maxRent) {
    where.push('min_rent > 0 AND min_rent <= ?');
    params.push(filters.maxRent);
  }
  if (filters.verifiedOnly) where.push('is_verified = 1');
  if (filters.availableOnly) where.push('available_beds > 0');
  if (filters.foodOnly) where.push('has_food = 1');
  if (filters.minRating && filters.minRating > 0) {
    where.push('rating >= ?');
    params.push(Math.min(5, filters.minRating));
  }
  const roomTypes = (filters.roomTypes || []).map((t) => t.toLowerCase()).filter((t) => ROOM_TYPE_KEYS.includes(t));
  if (roomTypes.length) {
    where.push(`(${roomTypes.map(() => 'room_types LIKE ?').join(' OR ')})`);
    for (const t of roomTypes) params.push(`%|${t}|%`);
  }
  for (const amenity of (filters.amenities || []).slice(0, 12)) {
    const key = amenity.toLowerCase().replace(/[%_|]/g, '').trim();
    if (!key) continue;
    where.push('amenities_text LIKE ?');
    params.push(`%${key}%`);
  }
  // Distance: a bounding box keeps it on the (status, latitude, longitude) index; the equirectangular
  // approximation below is accurate to well under 1% at city scale and needs no extensions.
  let distanceExpr = '';
  if (filters.near && Number.isFinite(filters.near.lat) && Number.isFinite(filters.near.lng)) {
    const { lat, lng } = filters.near;
    const radiusKm = Math.min(200, Math.max(0.5, filters.near.radiusKm || 30));
    const dLat = radiusKm / 111;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const dLng = radiusKm / (111 * Math.max(0.1, cosLat));
    where.push('latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?');
    params.push(lat - dLat, lat + dLat, lng - dLng, lng + dLng);
    distanceExpr = `((latitude - ${lat}) * (latitude - ${lat}) + ((longitude - ${lng}) * ${cosLat.toFixed(6)}) * ((longitude - ${lng}) * ${cosLat.toFixed(6)}))`;
  }
  if (filters.query) {
    for (const term of filters.query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)) {
      where.push('search_text LIKE ?');
      params.push(`%${term.replace(/[%_]/g, '')}%`);
    }
  }
  const pageSize = Math.min(500, Math.max(1, Math.floor(filters.pageSize || filters.limit || 24)));
  const page = Math.max(1, Math.floor(filters.page || 1));
  const sort = filters.sort === 'nearest' && !distanceExpr ? 'relevance' : filters.sort || 'relevance';
  const { items, total } = properties.search({
    where,
    params,
    orderBy: sort === 'nearest' ? `${distanceExpr} ASC, rating DESC` : SORTS[sort],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return {
    items: items.map(toCardListing),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Recomputes every room's `availableBedsCount` so that beds held by an active (Pending/Confirmed)
 * booking are not advertised as free. Occupancy alone under-reports reservations: a resident would
 * otherwise see "1 bed available", try to book, and be refused with a conflict. Called after any
 * booking transition; returns the stored listing.
 */
export function syncBedAvailability(propertyId: string): OwnerPropertyListing | null {
  const prop = properties.get(propertyId);
  if (!prop) return null;
  const held = new Set(
    bookings
      .list({ property_id: prop.id })
      .filter((b) => b.bedId && ['Pending', 'Confirmed'].includes(b.bookingStatus))
      .map((b) => b.bedId as string)
  );
  let changed = false;
  prop.rooms = (prop.rooms || []).map((room) => {
    const occupied = room.beds.filter((b) => b.isOccupied).length;
    const reserved = room.beds.filter((b) => !b.isOccupied && held.has(b.id)).length;
    const available = Math.max(0, room.beds.length - occupied - reserved);
    if (room.availableBedsCount === available && room.occupiedBedsCount === occupied) return room;
    changed = true;
    return { ...room, occupiedBedsCount: occupied, availableBedsCount: available };
  });
  return changed ? properties.replace(prop) : prop;
}

/** Removes owner-private information before a listing is exposed publicly. */
export function toPublicListing(p: OwnerPropertyListing): OwnerPropertyListing {
  return {
    ...p,
    ownerEmail: '',
    documents: [],
    caretaker: p.caretaker?.isPubliclyVisible
      ? { ...p.caretaker, email: undefined, emergencyContact: undefined }
      : {
          name: 'Property Manager',
          phone: '',
          isIdentityVerified: p.caretaker?.isIdentityVerified || false,
          isBackgroundVerified: p.caretaker?.isBackgroundVerified || false,
          isPubliclyVisible: false,
        },
    rooms: p.rooms.map((r) => ({
      ...r,
      beds: r.beds.map((b) => ({ id: b.id, bedNumber: b.bedNumber, isOccupied: b.isOccupied })),
    })),
  };
}

/** Trimmed projection for catalogue/card views; the details endpoint returns the full record. */
export function toCardListing(p: OwnerPropertyListing): OwnerPropertyListing {
  const pub = toPublicListing(p);
  return {
    ...pub,
    summary: true,
    longDescription: '',
    reviews: [],
    nearbyPlaces: [],
    documents: [],
    gallery: pub.gallery.slice(0, 4).map((g) => ({ id: g.id, url: g.url, title: g.title, category: g.category })),
    policies: { ...pub.policies, additionalRules: [] },
    rooms: pub.rooms.map((r) => ({ ...r, beds: [], amenities: undefined }) as unknown as PropertyRoom),
  };
}

/** Legacy links may carry an older suffix; resolve them through the indexed slug column, not a table scan. */
function findBySlugPrefix(key: string) {
  if (key.length < 8) return null;
  const escaped = key.replace(/[\\%_]/g, '\\$&');
  const row = getDb()
    .prepare("SELECT id FROM properties WHERE slug LIKE ? ESCAPE '\\' ORDER BY slug LIMIT 1")
    .get(`${escaped}%`) as { id: string } | undefined;
  return row ? properties.get(row.id) : null;
}

export function getPublicBySlugOrId(slugOrId: string, viewer?: AuthUser | null): OwnerPropertyListing {
  const key = slugOrId.toLowerCase();
  const prop = properties.findOne({ slug: key }) || properties.get(slugOrId) || findBySlugPrefix(key);
  if (!prop) throw notFound('Property');
  const isOwnerSide = viewer && (viewer.role === 'super_admin' || (viewer.ownerId && viewer.ownerId === prop.ownerId));
  if (prop.status !== 'published' && !isOwnerSide) throw notFound('Property');
  return isOwnerSide ? prop : toPublicListing(prop);
}

export function recordView(id: string): void {
  const prop = properties.get(id);
  if (!prop || prop.status !== 'published') return;
  prop.systemMetrics.viewsCount = (prop.systemMetrics.viewsCount || 0) + 1;
  properties.replace(prop);
}

export function listForOwner(ownerId: string): OwnerPropertyListing[] {
  return properties.list({ owner_id: ownerId });
}

export function listAll(): OwnerPropertyListing[] {
  return properties.list();
}

function getOwned(ownerId: string, id: string): OwnerPropertyListing {
  const prop = properties.get(id);
  if (!prop || prop.ownerId !== ownerId) throw notFound('Property');
  return prop;
}

function validateRooms(rooms: unknown): PropertyRoom[] {
  const list = v.arr<PropertyRoom>(rooms, 'Rooms', 200);
  return list.map((room, i) => {
    const r = v.obj(room, `Room ${i + 1}`) as unknown as PropertyRoom;
    if (!isSafeId(r.id)) r.id = newId('room');
    r.name = v.str(r.name, `Room ${i + 1} name`, { max: 80 });
    r.monthlyRent = v.num(r.monthlyRent, `Room ${i + 1} rent`, { min: 0, max: 10_000_000 });
    r.securityDeposit = v.num(r.securityDeposit ?? 0, `Room ${i + 1} deposit`, {
      min: 0,
      max: 10_000_000,
      required: false,
    });
    r.beds = v.arr(r.beds, `Room ${i + 1} beds`, 50).map((bed, j) => {
      const b = v.obj(bed, `Bed ${j + 1}`) as unknown as PropertyRoom['beds'][number];
      if (!isSafeId(b.id)) b.id = newId('bed');
      b.bedNumber = v.str(b.bedNumber || `Bed ${j + 1}`, 'Bed number', { max: 40 });
      b.isOccupied = !!b.isOccupied;
      return b;
    });
    r.capacity = r.beds.length || v.num(r.capacity ?? 1, 'Capacity', { min: 1, max: 50, required: false });
    r.occupiedBedsCount = r.beds.filter((b) => b.isOccupied).length;
    r.availableBedsCount = r.beds.length - r.occupiedBedsCount;
    return r;
  });
}

function uniqueSlug(base: string, excludeId?: string): string {
  const slug = slugify(base) || 'property';
  let attempt = slug;
  let n = 0;
  while (true) {
    const existing = properties.findOne({ slug: attempt });
    if (!existing || existing.id === excludeId) return attempt;
    n += 1;
    attempt = `${slug}-${n + 1}`;
    if (n > 20) attempt = `${slug}-${Date.now().toString(36)}`;
  }
}

/**
 * Creates a listing from a client-built draft. The client is trusted only for content; identity,
 * verification badges, metrics and status are always set here.
 */
export function create(
  actor: AuthUser,
  ownerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): OwnerPropertyListing {
  const owner = users.findById(ownerId);
  if (!owner) throw forbidden('Owner account not found');
  v.assertDocumentSize(body);
  assertCanAddProperty(ownerId);

  const draft = v.omitKeys(body as Record<string, unknown>, SYSTEM_CONTROLLED) as Partial<OwnerPropertyListing>;
  const name = v.str(draft.name || 'Untitled Property Listing', 'Property name', { max: 120 });
  const id = isSafeId(body.id) && !properties.exists(body.id as string) ? (body.id as string) : newId('prop');

  const listing: OwnerPropertyListing = {
    ...(draft as OwnerPropertyListing),
    id,
    ownerId,
    ownerName: owner.fullName,
    ownerEmail: owner.email,
    slug: uniqueSlug(typeof draft.slug === 'string' && draft.slug ? draft.slug : name),
    name,
    type: v.oneOf(draft.type, PROPERTY_TYPES, 'Property type', 'Co-living'),
    category: v.oneOf(draft.category, CATEGORIES, 'Category', 'Co-ed'),
    status: 'draft',
    completenessScore: 0,
    isNestinVerified: false,
    isFeatured: false,
    isZeroBrokerage: draft.isZeroBrokerage !== false,
    rooms: validateRooms(draft.rooms || []),
    gallery: v.arr(draft.gallery, 'Gallery', 60) as OwnerPropertyListing['gallery'],
    amenities: v.arr(draft.amenities, 'Amenities', 100) as OwnerPropertyListing['amenities'],
    nearbyPlaces: v.arr(draft.nearbyPlaces, 'Nearby places', 60) as OwnerPropertyListing['nearbyPlaces'],
    documents: (v.arr(draft.documents, 'Documents', 30) as OwnerPropertyListing['documents']).map((d) => ({
      ...d,
      status: 'pending' as const,
    })),
    tags: v.arr(draft.tags, 'Tags', 20).map((t) => String(t).slice(0, 40)),
    tourVideoUrl: sanitizeTourVideo(draft.tourVideoUrl),
    caretaker: {
      ...(draft.caretaker || { name: '', phone: '', isPubliclyVisible: true }),
      isIdentityVerified: false,
      isBackgroundVerified: false,
    },
    reviews: [],
    systemMetrics: {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      totalBookingsCount: 0,
      viewsCount: 0,
      createdAt: nowIso(),
      lastUpdatedAt: nowIso(),
    },
  };
  listing.completenessScore = calculatePropertyCompleteness(listing).score;
  properties.insert(listing);
  events.publish(
    'PropertyCreated',
    'Property',
    id,
    { name, ownerId },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return listing;
}

const OWNER_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['archived'],
  rejected: ['draft', 'archived'],
  published: ['archived'],
  archived: ['draft'],
  pending_approval: [],
};

export function update(
  actor: AuthUser,
  ownerId: string,
  id: string,
  body: Record<string, unknown>,
  ctx: EventContext
): OwnerPropertyListing {
  const existing = getOwned(ownerId, id);
  v.assertDocumentSize(body);
  const patch = v.omitKeys(
    body,
    SYSTEM_CONTROLLED.filter((k) => k !== 'status')
  ) as Partial<OwnerPropertyListing>;
  if ('tourVideoUrl' in patch) patch.tourVideoUrl = sanitizeTourVideo(patch.tourVideoUrl);

  // Status is workflow-controlled; owners may only archive/unarchive or move a rejected listing back to draft.
  let status = existing.status;
  if (patch.status && patch.status !== existing.status) {
    if (!OWNER_STATUS_TRANSITIONS[existing.status]?.includes(patch.status)) {
      throw conflict(
        `Cannot change status from '${existing.status}' to '${patch.status}'. Use the submit-for-verification workflow.`
      );
    }
    status = patch.status;
  }
  delete patch.status;

  if (patch.rooms) patch.rooms = validateRooms(patch.rooms);
  if (patch.name !== undefined) patch.name = v.str(patch.name, 'Property name', { max: 120 });
  if (patch.type !== undefined) patch.type = v.oneOf(patch.type, PROPERTY_TYPES, 'Property type');
  if (patch.category !== undefined) patch.category = v.oneOf(patch.category, CATEGORIES, 'Category');
  if (patch.caretaker)
    patch.caretaker = {
      ...existing.caretaker,
      ...patch.caretaker,
      isIdentityVerified: existing.caretaker.isIdentityVerified,
      isBackgroundVerified: existing.caretaker.isBackgroundVerified,
    };
  if (patch.documents) {
    const previous = new Map(existing.documents.map((d) => [d.id, d]));
    patch.documents = patch.documents.map((d) => ({
      ...d,
      status: previous.get(d.id)?.fileUrl === d.fileUrl ? previous.get(d.id)!.status : 'pending',
    }));
  }
  if (patch.slug && patch.slug !== existing.slug) patch.slug = uniqueSlug(patch.slug, id);

  // Editing a published listing's core content sends it back for review so verified badges stay truthful.
  const contentKeys = ['name', 'rooms', 'location', 'pricing', 'coverImage', 'gallery', 'documents', 'caretaker'];
  const touchesContent = contentKeys.some((k) => k in patch);
  if (existing.status === 'published' && touchesContent && status === 'published') status = 'pending_approval';

  const merged: OwnerPropertyListing = {
    ...existing,
    ...patch,
    status,
    systemMetrics: { ...existing.systemMetrics, lastUpdatedAt: nowIso() },
  };
  merged.completenessScore = calculatePropertyCompleteness(merged).score;
  properties.replace(merged);
  events.publish(
    'PropertyUpdated',
    'Property',
    id,
    { fields: Object.keys(patch), status },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return merged;
}

export function remove(actor: AuthUser, ownerId: string, id: string, ctx: EventContext): void {
  getOwned(ownerId, id);
  const active = bookings.list({ property_id: id }).filter((b) => ['Pending', 'Confirmed'].includes(b.bookingStatus));
  if (active.length)
    throw conflict(`This property has ${active.length} active booking(s). Cancel or complete them before deleting.`);
  properties.remove(id);
  events.publish('PropertyDeleted', 'Property', id, {}, { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId });
}

export function submitForVerification(
  actor: AuthUser,
  ownerId: string,
  id: string,
  ctx: EventContext
): { property: OwnerPropertyListing; message: string } {
  const prop = getOwned(ownerId, id);
  const { score, missing } = calculatePropertyCompleteness(prop);
  if (score < 70) {
    throw badRequest(
      `Listing is only ${score}% complete. Please provide the required fields before submitting for review.`,
      { missingFields: missing, score }
    );
  }
  if (prop.status === 'published') throw conflict('This listing is already published.');
  prop.status = 'pending_approval';
  prop.rejectionReason = undefined;
  prop.completenessScore = score;
  prop.systemMetrics.lastUpdatedAt = nowIso();
  properties.replace(prop);
  events.publish(
    'PropertySubmittedForReview',
    'Property',
    id,
    { score },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return {
    property: prop,
    message: 'Property submitted for verification. Our team reviews listings within 24-48 hours.',
  };
}

export interface ApproveOptions {
  isNestinVerified?: boolean;
  isFeatured?: boolean;
  isZeroBrokerage?: boolean;
  /** Verification evidence; required (all items true) when granting the Verified badge. */
  checklist?: Partial<Record<VerificationCheckId, boolean>>;
  notes?: string;
  siteVisitDate?: string;
  evidenceUrls?: string[];
}

function parseVerificationInput(
  body: Record<string, unknown>
): Pick<ApproveOptions, 'checklist' | 'notes' | 'siteVisitDate' | 'evidenceUrls'> {
  const rawChecklist =
    body.checklist && typeof body.checklist === 'object' ? (body.checklist as Record<string, unknown>) : {};
  const checklist: Partial<Record<VerificationCheckId, boolean>> = {};
  for (const item of VERIFICATION_CHECKLIST) checklist[item.id] = rawChecklist[item.id] === true;
  return {
    checklist,
    notes: v.optionalStr(body.notes, 'Verification notes', 4000),
    siteVisitDate: body.siteVisitDate ? v.isoDate(body.siteVisitDate, 'Site visit date', false) : undefined,
    evidenceUrls: v
      .arr<unknown>(body.evidenceUrls, 'Evidence', 20)
      .filter((u): u is string => typeof u === 'string' && /^(\/|https?:\/\/)/.test(u))
      .map((u) => u.slice(0, 500)),
  };
}

function verificationExpiry(from: Date): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + config.verification.validityMonths);
  return d.toISOString();
}

/**
 * Publishes a listing. Granting the "NestIn Verified" badge requires every checklist item to be
 * confirmed — the badge is the platform's core trust promise and must be backed by evidence.
 */
export function adminApprove(
  actor: AuthUser,
  id: string,
  options: Record<string, unknown>,
  ctx: EventContext
): OwnerPropertyListing {
  const prop = properties.get(id);
  if (!prop) throw notFound('Property');
  const grantVerified = options.isNestinVerified === undefined ? true : !!options.isNestinVerified;
  const evidence = parseVerificationInput(options);
  const now = nowIso();

  if (grantVerified) {
    const missing = VERIFICATION_CHECKLIST.filter((item) => !evidence.checklist?.[item.id]);
    if (missing.length) {
      throw badRequest('Every verification check must be confirmed before granting the Verified badge.', {
        missing: missing.map((m) => ({ id: m.id, label: m.label })),
      });
    }
    if (!evidence.siteVisitDate) throw badRequest('Record the site visit date to grant the Verified badge.');
    prop.verification = {
      status: 'verified',
      checklist: evidence.checklist!,
      notes: evidence.notes,
      siteVisitDate: evidence.siteVisitDate,
      evidenceUrls: evidence.evidenceUrls,
      verifiedBy: actor.id,
      verifiedByName: actor.fullName,
      verifiedAt: now,
      expiresAt: verificationExpiry(new Date()),
    };
    prop.caretaker = {
      ...prop.caretaker,
      isIdentityVerified: !!evidence.checklist?.caretakerIdentity,
      isBackgroundVerified: !!evidence.checklist?.caretakerBackground,
    };
    prop.documents = prop.documents.map((d) => ({ ...d, status: 'verified' as const }));
  } else {
    prop.verification = {
      status: 'unverified',
      checklist: evidence.checklist || {},
      notes: evidence.notes,
      siteVisitDate: evidence.siteVisitDate,
      evidenceUrls: evidence.evidenceUrls,
    };
  }

  prop.status = 'published';
  prop.isNestinVerified = grantVerified;
  if (grantVerified) fulfilVerificationOrder(prop.id);
  prop.isFeatured = options.isFeatured === undefined ? prop.isFeatured : !!options.isFeatured;
  prop.isZeroBrokerage = options.isZeroBrokerage === undefined ? prop.isZeroBrokerage : !!options.isZeroBrokerage;
  prop.rejectionReason = undefined;
  prop.systemMetrics = {
    ...prop.systemMetrics,
    publishedAt: prop.systemMetrics.publishedAt || now,
    lastUpdatedAt: now,
  };
  properties.replace(prop);
  events.publish(
    'PropertyApproved',
    'Property',
    id,
    { isNestinVerified: grantVerified, isFeatured: prop.isFeatured, isZeroBrokerage: prop.isZeroBrokerage },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: prop.ownerId }
  );
  return prop;
}

/** Removes the Verified badge (safety incident, failed re-verification, fraud). The listing stays live. */
export function adminRevokeVerification(
  actor: AuthUser,
  id: string,
  reason: string,
  ctx: EventContext
): OwnerPropertyListing {
  const prop = properties.get(id);
  if (!prop) throw notFound('Property');
  const why = v.str(reason, 'Reason', { max: 1000 });
  prop.isNestinVerified = false;
  prop.isFeatured = false;
  prop.verification = { ...(prop.verification || { checklist: {} }), status: 'revoked', revokedReason: why };
  prop.systemMetrics.lastUpdatedAt = nowIso();
  properties.replace(prop);
  events.publish(
    'PropertyVerificationRevoked',
    'Property',
    id,
    { reason: why },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: prop.ownerId }
  );
  return prop;
}

/**
 * Expires Verified badges older than the configured validity window and asks owners to schedule a
 * re-verification visit. Run daily; idempotent.
 */
export function runVerificationExpiry(now = new Date()): { expired: number; dueSoon: number } {
  let expired = 0;
  let dueSoon = 0;
  const soon = now.getTime() + 30 * 86_400_000;
  for (const prop of properties.list({ status: 'published' })) {
    const ver = prop.verification;
    if (!prop.isNestinVerified || !ver?.expiresAt) continue;
    const expiresAt = Date.parse(ver.expiresAt);
    if (expiresAt <= now.getTime()) {
      prop.isNestinVerified = false;
      prop.verification = { ...ver, status: 'expired' };
      prop.systemMetrics.lastUpdatedAt = nowIso();
      properties.replace(prop);
      events.publish('PropertyVerificationExpired', 'Property', prop.id, {}, { ownerId: prop.ownerId });
      expired += 1;
    } else if (expiresAt <= soon && !getMeta(`verification-due:${prop.id}:${ver.verifiedAt}`)) {
      setMeta(`verification-due:${prop.id}:${ver.verifiedAt}`, nowIso());
      dueSoon += 1;
      events.publish(
        'PropertyVerificationDueSoon',
        'Property',
        prop.id,
        { expiresAt: ver.expiresAt },
        { ownerId: prop.ownerId }
      );
    }
  }
  return { expired, dueSoon };
}

export function adminReject(actor: AuthUser, id: string, reason: string, ctx: EventContext): OwnerPropertyListing {
  const prop = properties.get(id);
  if (!prop) throw notFound('Property');
  prop.status = 'rejected';
  prop.rejectionReason = v.str(reason || 'Incomplete verification documents or incorrect address details.', 'Reason', {
    max: 1000,
  });
  prop.systemMetrics.lastUpdatedAt = nowIso();
  properties.replace(prop);
  events.publish(
    'PropertyRejected',
    'Property',
    id,
    { reason: prop.rejectionReason },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: prop.ownerId }
  );
  return prop;
}

export function adminSetBadges(
  actor: AuthUser,
  id: string,
  badges: { isNestinVerified?: boolean; isFeatured?: boolean; isZeroBrokerage?: boolean },
  ctx: EventContext
): OwnerPropertyListing {
  const prop = properties.get(id);
  if (!prop) throw notFound('Property');
  if (badges.isNestinVerified !== undefined) prop.isNestinVerified = !!badges.isNestinVerified;
  if (badges.isFeatured !== undefined) prop.isFeatured = !!badges.isFeatured;
  if (badges.isZeroBrokerage !== undefined) prop.isZeroBrokerage = !!badges.isZeroBrokerage;
  properties.replace(prop);
  events.publish(
    'PropertyBadgesUpdated',
    'Property',
    id,
    { ...badges },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: prop.ownerId }
  );
  return prop;
}

/** Marks a bed occupied/vacant and recomputes room and property counters. Used by CRM workflows and the vacancy manager. */
export function setBedStatus(
  prop: OwnerPropertyListing,
  roomId: string,
  bedId: string,
  isOccupied: boolean,
  occupantName?: string
): OwnerPropertyListing {
  let found = false;
  prop.rooms = prop.rooms.map((room) => {
    if (room.id !== roomId) return room;
    const beds = room.beds.map((bed) => {
      if (bed.id !== bedId) return bed;
      found = true;
      return {
        ...bed,
        isOccupied,
        occupantName: isOccupied ? occupantName || 'Tenant' : undefined,
        moveInDate: isOccupied ? bed.moveInDate || nowIso().slice(0, 10) : undefined,
      };
    });
    const occupied = beds.filter((b) => b.isOccupied).length;
    return { ...room, beds, occupiedBedsCount: occupied, availableBedsCount: beds.length - occupied };
  });
  if (!found) throw notFound('Bed');
  const totalBeds = prop.rooms.reduce((acc, r) => acc + r.beds.length, 0);
  prop.details = {
    ...prop.details,
    totalBeds: totalBeds || prop.details.totalBeds,
    capacity: totalBeds || prop.details.capacity,
  };
  prop.systemMetrics.lastUpdatedAt = nowIso();
  return prop;
}

export function updateBedStatus(
  actor: AuthUser,
  ownerId: string,
  id: string,
  body: Record<string, unknown>,
  ctx: EventContext
): OwnerPropertyListing {
  const prop = getOwned(ownerId, id);
  const roomId = v.str(body.roomId, 'Room id', { max: 80 });
  const bedId = v.str(body.bedId, 'Bed id', { max: 80 });
  const isOccupied = v.bool(body.isOccupied);
  const occupantName = v.optionalStr(body.occupantName, 'Occupant name', 120);
  const updated = Collection.transaction(() =>
    properties.replace(setBedStatus(prop, roomId, bedId, isOccupied, occupantName))
  );
  events.publish(
    'BedStatusChanged',
    'Property',
    id,
    { roomId, bedId, isOccupied },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return updated;
}

export function addReview(
  actor: AuthUser,
  propertyId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): OwnerPropertyListing {
  const prop = properties.get(propertyId);
  if (!prop || prop.status !== 'published') throw notFound('Property');
  const rating = v.num(body.rating, 'Rating', { min: 1, max: 5, integer: true });
  const comment = v.str(body.comment, 'Review', { min: 5, max: 2000 });
  const residentRoom = v.optionalStr(body.residentRoom, 'Room', 80) || 'Resident';
  const hasStayed = bookings
    .list({ tenant_id: actor.id, property_id: propertyId })
    .some((b) => ['Confirmed', 'Completed'].includes(b.bookingStatus));

  const review: PropertyResidentReview = {
    id: newId('rev'),
    author: actor.fullName,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(actor.fullName)}`,
    rating,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    comment,
    helpfulCount: 0,
    verifiedResident: hasStayed,
    residentRoom,
  };
  prop.reviews = [review, ...prop.reviews.filter((r) => r.author !== actor.fullName || r.comment !== comment)];
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as OwnerPropertyListing['systemMetrics']['ratingBreakdown'];
  for (const r of prop.reviews) breakdown[Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5] += 1;
  prop.systemMetrics = {
    ...prop.systemMetrics,
    averageRating: Number((prop.reviews.reduce((a, r) => a + r.rating, 0) / prop.reviews.length).toFixed(1)),
    totalReviews: prop.reviews.length,
    ratingBreakdown: breakdown,
  };
  properties.replace(prop);
  events.publish(
    'ReviewAdded',
    'Property',
    propertyId,
    { rating, verifiedResident: hasStayed },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: prop.ownerId }
  );
  return toPublicListing(prop);
}
