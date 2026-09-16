import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { startTestServer, client, login, adminLogin, DEMO } from "./helpers.js";

describe("property publishing workflow, RBAC and admin", () => {
  let close: () => Promise<void>;
  let api: ReturnType<typeof client>;
  let owner = "";
  let admin = "";

  before(async () => {
    const started = await startTestServer();
    close = started.close;
    api = client(started.baseUrl);
    owner = await login(api, DEMO.owner);
    admin = await adminLogin(api);
  });
  after(() => close());

  test("owner creates a draft, cannot self-publish, submits for review, admin approves, listing goes live", async () => {
    const created = await api.post("/properties/owner", { name: "Test Residency", isNestinVerified: true, status: "published", rooms: [] }, owner);
    assert.equal(created.status, 201, created.error?.message);
    assert.equal(created.data.status, "draft", "status is workflow-controlled");
    assert.equal(created.data.isNestinVerified, false, "badges are platform-controlled");
    assert.equal(created.data.ownerId, "owner-001");
    const id = created.data.id as string;

    assert.equal((await api.put(`/properties/owner/${id}`, { status: "published" }, owner)).status, 409, "owner cannot flip status to published");

    const tooEarly = await api.post(`/properties/owner/${id}/submit`, {}, owner);
    assert.equal(tooEarly.status, 400, "incomplete listing cannot be submitted");
    assert.ok(Array.isArray(tooEarly.error?.details && (tooEarly.error.details as any).missingFields));

    const complete = await api.put(
      `/properties/owner/${id}`,
      {
        shortDescription: "A lovely place",
        coverImage: "https://example.com/cover.jpg",
        gallery: [1, 2, 3].map((i) => ({ id: `g${i}`, url: `https://example.com/${i}.jpg`, title: `Photo ${i}`, category: "Bedrooms" })),
        rooms: [{ id: "r1", name: "Room 1", type: "Double Sharing", sharingTypeSlug: "double", floor: 1, sizeSqFt: 200, capacity: 2, availableBedsCount: 2, occupiedBedsCount: 0, bathroomType: "Attached Bathroom", hasAC: true, furnishing: "Fully Furnished", monthlyRent: 12000, securityDeposit: 24000, bookingFee: 999, maintenance: 500, beds: [{ id: "b1", bedNumber: "A", isOccupied: false }, { id: "b2", bedNumber: "B", isOccupied: false }] }],
        pricing: { minRent: 12000, securityDepositRefundPolicy: "Refundable", electricity: { type: "Metered", label: "Metered" }, water: { type: "Included", label: "Included" }, foodMess: { type: "Included", label: "Included" }, laundryAndHousekeeping: { type: "Included", label: "Included" }, maintenance: { type: "Included", amount: 500, label: "Included" }, bookingFee: 999 },
        amenities: [1, 2, 3].map((i) => ({ id: `a${i}`, name: `Amenity ${i}`, category: "Comfort", isAvailable: true })),
        policies: { curfew: "11 PM", visitorPolicy: "Lounge only", smokingAndAlcohol: "No", cancellationPolicy: "30 days", noticePeriod: "30 Days", petPolicy: "No", guestPolicy: "Day", ageRestrictions: "18+", genderPolicy: "Co-ed", additionalRules: [] },
        location: { addressLine1: "1 Test Road", area: "Madhapur", city: "Hyderabad", state: "Telangana", pincode: "500081", latitude: 17.4, longitude: 78.3, formattedAddress: "1 Test Road, Madhapur" },
        caretaker: { name: "Care Taker", phone: "+91 90000 00000", isIdentityVerified: true, isBackgroundVerified: true, isPubliclyVisible: true },
      },
      owner
    );
    assert.equal(complete.status, 200, complete.error?.message);
    assert.equal(complete.data.caretaker.isIdentityVerified, false, "verification flags cannot be self-asserted");
    assert.ok(complete.data.completenessScore >= 70);

    const submitted = await api.post(`/properties/owner/${id}/submit`, {}, owner);
    assert.equal(submitted.status, 200, submitted.error?.message);
    assert.equal(submitted.data.property.status, "pending_approval");
    assert.equal((await api.get(`/properties/public/${complete.data.slug}`)).status, 404, "pending listings are not public");

    assert.equal((await api.post(`/admin/properties/${id}/approve`, {}, owner)).status, 403, "owners cannot approve");
    const approved = await api.post(`/admin/properties/${id}/approve`, { isFeatured: true }, admin);
    assert.equal(approved.status, 200);
    assert.equal(approved.data.status, "published");
    assert.equal(approved.data.isNestinVerified, true);
    assert.equal(approved.data.isFeatured, true);
    assert.equal(approved.data.caretaker.isIdentityVerified, true);

    const publicView = await api.get(`/properties/public/${complete.data.slug}`);
    assert.equal(publicView.status, 200);
    assert.equal(publicView.data.ownerEmail, "");

    // Editing core content of a live listing sends it back to review.
    const edited = await api.put(`/properties/owner/${id}`, { name: "Test Residency Deluxe" }, owner);
    assert.equal(edited.data.status, "pending_approval");

    const rejected = await api.post(`/admin/properties/${id}/reject`, { reason: "Photos too dark" }, admin);
    assert.equal(rejected.data.status, "rejected");
    assert.equal(rejected.data.rejectionReason, "Photos too dark");
  });

  test("RBAC: staff accounts are created with a login, roles are owner-scoped, owner role is locked", async () => {
    const snap = await api.get("/rbac/snapshot", owner);
    assert.equal(snap.status, 200);
    const ownerRole = snap.data.roles.find((r: any) => r.isOwnerRole);
    assert.ok(ownerRole);
    assert.equal((await api.delete(`/rbac/roles/${ownerRole.id}`, owner)).status, 409);
    assert.equal((await api.put(`/rbac/roles/${ownerRole.id}`, { ...ownerRole, permissions: { "dashboard.view": false } }, owner)).status, 409);

    const role = await api.post("/rbac/roles", { name: "Night Warden", description: "Night shift", authorityLevel: "low", permissions: { "visitors.view": true, "visitors.create": true, "bogus.permission": true } }, owner);
    assert.equal(role.status, 201);
    assert.equal(role.data.permissions["bogus.permission"], undefined, "unknown permissions are dropped");

    const emp = await api.post("/rbac/employees", { name: "Nisha Warden", email: "nisha.warden@example.com", phone: "+91 91234 56789", roleId: role.data.id, assignedProperties: ["all"] }, owner);
    assert.equal(emp.status, 201, emp.error?.message);
    assert.ok(emp.data.temporaryPassword, "temporary password returned once");

    const staffLogin = await api.post("/auth/login", { email: "nisha.warden@example.com", password: emp.data.temporaryPassword });
    assert.equal(staffLogin.status, 200);
    assert.equal(staffLogin.data.user.role, "employee");
    assert.equal(staffLogin.data.user.ownerId, "owner-001");
    assert.equal(staffLogin.data.user.permissions["visitors.view"], true);
    assert.equal(!!staffLogin.data.user.permissions["leads.delete"], false);

    // Role in use cannot be deleted; the staff member is limited to their permissions.
    assert.equal((await api.delete(`/rbac/roles/${role.data.id}`, owner)).status, 409);
    assert.equal((await api.post("/crm/leads", { fullName: "X", phone: "+91 90000 00000" }, staffLogin.data.token)).status, 403);
    assert.equal((await api.post("/crm/visitors", { visitorName: "V", phone: "+91 90000 00000", propertyId: "prop-banyan-premium", visitDate: "2026-10-10" }, staffLogin.data.token)).status, 201);

    // Per-employee override grants an extra permission immediately.
    const withOverride = await api.put(`/rbac/employees/${emp.data.id}`, { overrides: { "leads.create": true } }, owner);
    assert.equal(withOverride.status, 200);
    assert.equal((await api.post("/crm/leads", { fullName: "Override Lead", phone: "+91 90000 00002" }, staffLogin.data.token)).status, 201);

    // Removing the employee suspends the login.
    assert.equal((await api.delete(`/rbac/employees/${emp.data.id}`, owner)).status, 200);
    assert.equal((await api.get("/auth/me", staffLogin.data.token)).status, 401);
  });

  test("CRM documents are owner-scoped and validated", async () => {
    const lead = await api.post("/crm/leads", { fullName: "Priya Test", phone: "+91 98765 00000", email: "priya.test@example.com", stage: "New", propertyId: "prop-banyan-premium", propertyName: "Banyan", roomType: "Double", budget: 12000, source: "Website", assignedTo: "Owner" }, owner);
    assert.equal(lead.status, 201);
    assert.equal(lead.data.ownerId, "owner-001");
    const invalid = await api.post("/crm/leads", { fullName: "", phone: "abc" }, owner);
    assert.equal(invalid.status, 400);
    const hijack = await api.put(`/crm/leads/${lead.data.id}`, { ...lead.data, ownerId: "owner-marketplace", stage: "Converted" }, owner);
    assert.equal(hijack.data.ownerId, "owner-001", "ownerId is immutable");

    const marketplaceOwner = await login(api, "marketplace@nestin.com");
    assert.equal((await api.put(`/crm/leads/${lead.data.id}`, { stage: "Lost" }, marketplaceOwner)).status, 404, "other owners cannot see it");
  });

  test("public forms land in the admin inbox and admin can manage accounts", async () => {
    const contact = await api.post("/public/contact", { fullName: "Site Visitor", email: "visitor@example.com", message: "Hello, I have a question." });
    assert.equal(contact.status, 201);
    assert.match(contact.data.ticketNumber, /^NST-\d{6}$/);
    const demo = await api.post("/public/owner-demo", { name: "PG Owner", phone: "+91 90000 11111", email: "pg.owner@example.com", business_name: "Sunrise PG", property_count: "3-5" });
    assert.equal(demo.status, 201);

    const inbox = await api.get("/admin/inbound", admin);
    assert.ok(inbox.data.some((r: any) => r.kind === "contact" && r.email === "visitor@example.com"));
    assert.ok(inbox.data.some((r: any) => r.kind === "owner_demo"));

    const users = await api.get("/admin/users?role=tenant", admin);
    const tenantUser = users.data.find((u: any) => u.email === DEMO.tenant);
    assert.ok(tenantUser);
    const suspended = await api.put(`/admin/users/${tenantUser.id}/status`, { status: "suspended" }, admin);
    assert.equal(suspended.data.status, "suspended");
    assert.equal((await api.post("/auth/login", { email: DEMO.tenant, password: DEMO.password })).status, 403);
    await api.put(`/admin/users/${tenantUser.id}/status`, { status: "active" }, admin);

    const stats = await api.get("/admin/stats", admin);
    assert.ok(stats.data.properties.total > 200);
    assert.ok(stats.data.recentEvents.length > 0);
  });
});
