import type { OwnerPropertyListing } from '../../src/types/property';
import { config } from '../config.js';
import { getMeta, setMeta, Collection } from './database.js';
import {
  users,
  properties,
  leads,
  bookings,
  visitors,
  customers,
  crmActivity,
  roles,
  employees,
  rbacAudit,
  payments,
  documents,
  supportTickets,
  notifications,
  wishlist,
} from './repositories.js';
import { hashPassword } from '../lib/password.js';
import { newId } from '../lib/ids.js';
import { INITIAL_PROPERTIES_SEED } from '../../src/data/canonicalPropertiesSeed';
import { GENERATED_PROPERTIES_DATA } from '../../src/data/propertiesData';
import {
  getPropertyBySlug as getLegacyPropertyBySlug,
  detailedPropertyToOwnerPropertyListing,
} from '../../src/data/propertyDetailsHelper';
import {
  INITIAL_LEADS_SEED,
  INITIAL_BOOKINGS_SEED,
  INITIAL_VISITORS_SEED,
  INITIAL_CUSTOMERS_SEED,
  INITIAL_AUDIT_LOGS_SEED,
} from '../../src/data/crmSeedData';
import { INITIAL_ROLES, INITIAL_EMPLOYEES, INITIAL_AUDIT_LOGS } from '../../src/data/rbacData';
import { INITIAL_TENANT_DOCUMENTS, INITIAL_TENANT_PAYMENTS, INITIAL_SUPPORT_TICKETS } from '../../src/data/tenantData';
import { setBedStatus } from '../services/propertyService.js';
import {
  DEFAULT_LIVING_PREFERENCES,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
} from '../../src/lib/domain/defaults';

export const DEMO_ACCOUNTS = {
  owner: { id: 'owner-001', email: 'owner@nestin.com', name: 'Paritala Venkata Vaibhav' },
  tenant: { id: 'tenant-001', email: 'tenant@nestin.com', name: 'Ananya Sharma' },
  staff: { id: 'emp-user-001', email: 'staff@nestin.com', name: 'Ramesh Reddy' },
  marketplace: { id: 'owner-marketplace', email: 'marketplace@nestin.com', name: 'NestIn Marketplace Partners' },
};

/** Personal identities that were hard-coded in the original seed data are mapped onto the demo accounts. */
const EMAIL_REWRITES: Record<string, string> = {
  'venkatavaibhavparitala@gmail.com': DEMO_ACCOUNTS.owner.email,
  'ananya.sharma@gmail.com': DEMO_ACCOUNTS.tenant.email,
  'ramesh.reddy@nestin.io': DEMO_ACCOUNTS.staff.email,
};

const rewriteEmail = (email?: string) => (email ? EMAIL_REWRITES[email.toLowerCase()] || email : email);

/**
 * Seeds the super admin account (always) and, unless SEED_DEMO_DATA=false, a fully populated demo
 * owner with properties, CRM pipeline, staff, and a demo tenant with bookings and payments.
 * Idempotent: runs once per database.
 */
export function seedDatabase(): void {
  ensureSuperAdmin();
  if (!config.seedDemoData || getMeta('demo_seeded') === 'v1') return;
  Collection.transaction(() => {
    seedDemo();
    setMeta('demo_seeded', 'v1');
  });
  console.log('[db] demo data seeded');
}

function ensureSuperAdmin(): void {
  const existing = users.findByEmail(config.superAdmin.email);
  if (existing) return;
  if (!config.superAdmin.password) {
    console.warn('[db] SUPER_ADMIN_PASSWORD is not set; no super admin account was created.');
    return;
  }
  users.insert({
    id: 'admin-001',
    email: config.superAdmin.email,
    passwordHash: hashPassword(config.superAdmin.password),
    role: 'super_admin',
    ownerId: null,
    fullName: 'NestIn Super Administrator',
    status: 'active',
    authProvider: 'system',
    data: { city: 'Hyderabad' },
  });
}

function seedDemo(): void {
  const password = hashPassword(config.demoPassword);
  const ownerId = DEMO_ACCOUNTS.owner.id;

  // ---- Accounts ------------------------------------------------------------------------------
  users.insert({
    id: ownerId,
    email: DEMO_ACCOUNTS.owner.email,
    passwordHash: password,
    role: 'owner',
    ownerId: null,
    fullName: DEMO_ACCOUNTS.owner.name,
    status: 'active',
    authProvider: 'email',
    data: {
      phone: '+91 98765 43210',
      city: 'Hyderabad',
      dob: '1994-08-20',
      gender: 'Male',
      occupation: 'Working Professional',
      collegeOrCompany: 'NestIn Living Spaces',
      bio: 'Founder and Managing Partner at NestIn Living Properties.',
      language: 'English, Telugu, Hindi',
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
  });
  users.insert({
    id: DEMO_ACCOUNTS.tenant.id,
    email: DEMO_ACCOUNTS.tenant.email,
    passwordHash: password,
    role: 'tenant',
    ownerId: null,
    fullName: DEMO_ACCOUNTS.tenant.name,
    status: 'active',
    authProvider: 'email',
    data: {
      phone: '+91 98450 12345',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      city: 'Hyderabad',
      dob: '1999-05-14',
      gender: 'Female',
      occupation: 'Working Professional',
      collegeOrCompany: 'Cognizant Technology Solutions',
      bio: 'Software Engineer relocating to Hitec City. Looking for a verified coliving space with good WiFi.',
      language: 'English (India)',
      livingPreferences: DEFAULT_LIVING_PREFERENCES,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
  });

  // ---- Properties ----------------------------------------------------------------------------
  // Demo listings that carry the Verified badge get a matching verification record (as the admin
  // approval flow would create) so expiry sweeps and the trust desk have real data to show.
  const demoVerification = (p: OwnerPropertyListing): OwnerPropertyListing['verification'] | undefined => {
    if (!p.isNestinVerified) return undefined;
    const verifiedAt = new Date(Date.now() - 30 * 86_400_000);
    const expiresAt = new Date(verifiedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 12);
    return {
      status: 'verified',
      checklist: {
        ownershipDocuments: true,
        licenses: true,
        siteVisit: true,
        photosMatch: true,
        caretakerIdentity: true,
        caretakerBackground: true,
        safety: true,
        pricingAccurate: true,
      },
      notes: 'Demo verification record (SEED_DEMO_DATA).',
      siteVisitDate: verifiedAt.toISOString().slice(0, 10),
      verifiedByName: 'NestIn Trust Desk',
      verifiedAt: verifiedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  };
  for (const seed of INITIAL_PROPERTIES_SEED) {
    properties.insert({
      ...seed,
      ownerId,
      ownerName: DEMO_ACCOUNTS.owner.name,
      ownerEmail: DEMO_ACCOUNTS.owner.email,
      verification: demoVerification(seed),
    });
  }

  // Marketplace catalogue: the generated demo inventory is owned by a separate "marketplace" owner
  // account so that every listing visible on the site is a real, bookable record.
  const marketplace = users.insert({
    id: DEMO_ACCOUNTS.marketplace.id,
    email: DEMO_ACCOUNTS.marketplace.email,
    passwordHash: password,
    role: 'owner',
    ownerId: null,
    fullName: DEMO_ACCOUNTS.marketplace.name,
    status: 'active',
    authProvider: 'email',
    data: { city: 'Bengaluru' },
  });
  for (const listing of GENERATED_PROPERTIES_DATA) {
    if (!listing.slug || properties.findOne({ slug: listing.slug }) || properties.exists(listing.id)) continue;
    const detailed = getLegacyPropertyBySlug(listing.slug);
    if (!detailed) continue;
    const converted = detailedPropertyToOwnerPropertyListing(detailed);
    properties.insert({
      ...converted,
      id: listing.id,
      ownerId: marketplace.id,
      ownerName: marketplace.fullName,
      ownerEmail: marketplace.email,
      status: 'published',
      verification: demoVerification(converted),
    });
  }

  // ---- RBAC ----------------------------------------------------------------------------------
  for (const role of INITIAL_ROLES) roles.insert({ ...role, ownerId });
  for (const emp of INITIAL_EMPLOYEES) {
    const email = rewriteEmail(emp.email)!;
    let userId: string | undefined;
    if (emp.roleId === 'role-owner') {
      userId = ownerId; // the owner appears in the staff directory but signs in with the owner account
    } else {
      const account = users.insert({
        id: email === DEMO_ACCOUNTS.staff.email ? DEMO_ACCOUNTS.staff.id : newId('emp'),
        email,
        passwordHash: password,
        role: 'employee',
        ownerId,
        fullName: emp.name,
        status: 'active',
        authProvider: 'email',
        data: { phone: emp.phone, avatar: emp.avatar, employeeId: emp.id },
      });
      userId = account.id;
    }
    employees.insert({ ...emp, email, ownerId, userId });
  }
  for (const log of INITIAL_AUDIT_LOGS) rbacAudit.insert({ ...log, ownerId });

  // ---- CRM -----------------------------------------------------------------------------------
  // The original CRM seed referenced properties and beds that do not exist in the property seed;
  // records are remapped onto real inventory so that server-side integrity checks hold.
  const tenantId = DEMO_ACCOUNTS.tenant.id;
  const PROPERTY_REMAP: Record<string, string> = {
    'prop-ist-gachibowli': 'prop-sea-breeze',
    'prop-stanza-koramangala': 'prop-draft-hitech',
  };
  const remapProperty = <T extends { propertyId: string; propertyName: string }>(item: T): T => {
    const targetId = PROPERTY_REMAP[item.propertyId] || item.propertyId;
    const prop = properties.get(targetId);
    return prop ? { ...item, propertyId: targetId, propertyName: prop.name } : item;
  };
  for (const lead of INITIAL_LEADS_SEED)
    leads.insert(remapProperty({ ...lead, email: rewriteEmail(lead.email), ownerId }));
  for (const visit of INITIAL_VISITORS_SEED)
    visitors.insert(remapProperty({ ...visit, email: rewriteEmail(visit.email), ownerId }));

  const resolveBed = (propertyId: string, roomId: string, bedId: string) => {
    const prop = properties.get(propertyId);
    if (!prop) return null;
    const byId = prop.rooms.flatMap((r) => r.beds.map((b) => ({ room: r, bed: b }))).find((x) => x.bed.id === bedId);
    if (byId) return { prop, ...byId };
    const room = prop.rooms.find((r) => r.id === roomId) || prop.rooms[0];
    const bed = room?.beds.find((b) => !b.isOccupied) || room?.beds[0];
    return room && bed ? { prop, room, bed } : null;
  };

  for (const customer of INITIAL_CUSTOMERS_SEED) {
    const email = rewriteEmail(customer.email)!;
    const mapped = remapProperty({
      ...customer,
      email,
      ownerId,
      tenantId: email === DEMO_ACCOUNTS.tenant.email ? tenantId : undefined,
    });
    const slot = resolveBed(mapped.propertyId, mapped.roomId, mapped.bedId);
    if (slot) {
      mapped.roomId = slot.room.id;
      mapped.roomName = slot.room.name;
      mapped.bedId = slot.bed.id;
      mapped.bedNumber = slot.bed.bedNumber;
      if (mapped.tenantStatus === 'Active' || mapped.tenantStatus === 'Upcoming')
        properties.replace(setBedStatus(slot.prop, slot.room.id, slot.bed.id, true, mapped.fullName));
    }
    customers.insert(mapped);
  }
  for (const booking of INITIAL_BOOKINGS_SEED) {
    const tenantEmail = rewriteEmail(booking.tenantEmail)!;
    const mapped = remapProperty({
      ...booking,
      tenantEmail,
      ownerId,
      tenantId: tenantEmail === DEMO_ACCOUNTS.tenant.email ? tenantId : undefined,
    });
    const prop = properties.get(mapped.propertyId);
    const customer = mapped.customerId ? customers.get(mapped.customerId) : null;
    if (customer) {
      mapped.roomId = customer.roomId;
      mapped.roomName = customer.roomName;
      mapped.bedId = customer.bedId;
      mapped.bedNumber = customer.bedNumber;
    } else {
      const slot = resolveBed(mapped.propertyId, mapped.roomId, mapped.bedId);
      if (slot) {
        mapped.roomId = slot.room.id;
        mapped.roomName = slot.room.name;
        mapped.bedId = slot.bed.id;
        mapped.bedNumber = slot.bed.bedNumber;
        if (mapped.bookingStatus === 'Confirmed')
          properties.replace(setBedStatus(slot.prop, slot.room.id, slot.bed.id, true, mapped.tenantName));
      }
    }
    bookings.insert({
      ...mapped,
      propertyCity: prop?.location?.city,
      propertySlug: prop?.slug,
      propertyImage: mapped.propertyImage || prop?.coverImage,
    });
  }
  for (const log of INITIAL_AUDIT_LOGS_SEED) crmActivity.insert({ ...log, ownerId });

  // ---- Tenant portal data --------------------------------------------------------------------
  for (const doc of INITIAL_TENANT_DOCUMENTS) documents.insert({ ...doc, tenantId });
  for (const ticket of INITIAL_SUPPORT_TICKETS) supportTickets.insert({ ...ticket, tenantId });
  for (const pay of INITIAL_TENANT_PAYMENTS) {
    payments.insert({
      id: pay.id,
      ownerId,
      tenantId,
      bookingId: pay.bookingId,
      propertyName: pay.pgName,
      tenantName: DEMO_ACCOUNTS.tenant.name,
      amount: pay.amount,
      currency: 'INR',
      type: pay.type,
      method: pay.paymentMethod,
      status: pay.status,
      gateway: 'simulated',
      invoiceNumber: pay.invoiceNumber,
      transactionId: pay.transactionId,
      month: pay.month,
      date: pay.date,
      createdAt: new Date(pay.date).toISOString(),
    });
  }
  for (const id of ['prop-banyan-premium', 'prop-sea-breeze']) if (properties.exists(id)) wishlist.add(tenantId, id);

  notifications.insert({
    id: newId('ntf'),
    userId: ownerId,
    title: 'Welcome to your NestIn Owner Portal',
    message: 'Your demo workspace is ready: 3 properties, a live CRM pipeline and a staff team have been provisioned.',
    type: 'system',
    timestamp: new Date().toLocaleString('en-GB'),
    isRead: false,
    linkTo: '/owner/dashboard',
  });
  notifications.insert({
    id: newId('ntf'),
    userId: tenantId,
    title: 'Welcome to NestIn 🏠',
    message: 'Your booking at Nestin Grand Luxury Coliving is confirmed. Move-in date is 1st Sept 2026.',
    type: 'booking',
    timestamp: new Date().toLocaleString('en-GB'),
    isRead: false,
    linkTo: '/my-bookings',
  });
}
