import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { startTestServer, client, login, DEMO } from "./helpers.js";

describe("booking lifecycle (tenant → owner CRM → inventory → payments)", () => {
  let close: () => Promise<void>;
  let api: ReturnType<typeof client>;
  let tenant = "";
  let owner = "";
  let staff = "";

  before(async () => {
    const started = await startTestServer();
    close = started.close;
    api = client(started.baseUrl);
    tenant = await login(api, DEMO.tenant);
    owner = await login(api, DEMO.owner);
    staff = await login(api, DEMO.staff);
  });
  after(() => close());

  const findFreeBed = async () => {
    const list = await api.get("/properties/public");
    const banyan = list.data.find((p: any) => p.id === "prop-banyan-premium");
    const full = await api.get(`/properties/public/${banyan.slug}`);
    for (const room of full.data.rooms) {
      const bed = room.beds.find((b: any) => !b.isOccupied);
      if (bed) return { property: full.data, room, bed };
    }
    throw new Error("no free bed in seed");
  };

  test("public catalogue is a trimmed projection and hides owner-private data", async () => {
    const list = await api.get("/properties/public");
    assert.equal(list.status, 200);
    assert.ok(list.data.length > 100, "marketplace catalogue is seeded");
    const first = list.data[0];
    assert.equal(first.summary, true);
    assert.equal(first.ownerEmail, "");
    assert.deepEqual(first.documents, []);
    const detail = await api.get(`/properties/public/${first.slug}`);
    assert.equal(detail.status, 200);
    assert.notEqual(detail.data.summary, true);
    assert.equal(detail.data.ownerEmail, "");
  });

  test("drafts are not visible publicly, but the owner sees them", async () => {
    assert.equal((await api.get("/properties/public/prop-draft-hitech")).status, 404);
    const ownerList = await api.get("/properties/owner", owner);
    assert.ok(ownerList.data.some((p: any) => p.id === "prop-draft-hitech"));
  });

  test("full lifecycle: book → double-booking blocked → staff approves → bed occupied → customer & payment created → tenant sees it", async () => {
    const { property, room, bed } = await findFreeBed();

    const booking = await api.post("/tenant/bookings", { propertyId: property.id, roomId: room.id, bedId: bed.id, moveInDate: "2026-11-01", tenantPhone: "+91 98450 12345" }, tenant);
    assert.equal(booking.status, 201, booking.error?.message);
    assert.equal(booking.data.booking.bookingStatus, "Pending");
    assert.equal(booking.data.booking.ownerId, property.ownerId);
    assert.equal(booking.data.tenantBooking.status, "upcoming");
    const bookingId = booking.data.booking.id as string;

    // Another tenant cannot grab the same bed while the request is pending.
    const other = await api.post("/auth/register", { email: "second.tenant@example.com", password: "Strong123", fullName: "Second Tenant" });
    const clash = await api.post("/tenant/bookings", { propertyId: property.id, roomId: room.id, bedId: bed.id, moveInDate: "2026-11-01", tenantPhone: "+91 90000 00001" }, other.data.token);
    assert.equal(clash.status, 409);

    // A tenant cannot approve their own booking, and the CRM endpoint is owner-scoped.
    assert.equal((await api.post(`/crm/bookings/${bookingId}/approve`, {}, tenant)).status, 403);

    // The property manager (staff with bookings.approve) approves it.
    const approved = await api.post(`/crm/bookings/${bookingId}/approve`, {}, staff);
    assert.equal(approved.status, 200, approved.error?.message);
    assert.equal(approved.data.booking.bookingStatus, "Confirmed");
    assert.equal(approved.data.booking.paymentStatus, "Paid");
    assert.ok(approved.data.customer.id);
    assert.equal(approved.data.customer.tenantId, "tenant-001");
    const bedAfter = approved.data.property.rooms.find((r: any) => r.id === room.id).beds.find((b: any) => b.id === bed.id);
    assert.equal(bedAfter.isOccupied, true);

    // Approving twice is rejected.
    assert.equal((await api.post(`/crm/bookings/${bookingId}/approve`, {}, staff)).status, 409);

    // Tenant-facing views reflect the confirmation and the payments.
    const mine = await api.get("/tenant/bookings", tenant);
    const confirmed = mine.data.find((b: any) => b.id === bookingId);
    assert.equal(confirmed.status, "upcoming", "confirmed but move-in is in the future");
    const payments = await api.get("/tenant/payments", tenant);
    assert.ok(payments.data.some((p: any) => p.bookingId === bookingId && p.type === "Token Booking"));
    assert.ok(payments.data.some((p: any) => p.bookingId === bookingId && p.type === "Security Deposit"));

    // Owner CRM snapshot contains the customer and activity.
    const snap = await api.get("/crm/snapshot", owner);
    assert.ok(snap.data.customers.some((c: any) => c.id === approved.data.customer.id));
    assert.ok(snap.data.auditLogs.some((a: any) => a.action === "Booking Approved"));
    assert.ok(snap.data.notifications.some((n: any) => n.title === "Booking Approved"));

    // Move-in, then move-out releases the bed.
    const moveIn = await api.post(`/crm/bookings/${bookingId}/complete-move-in`, {}, owner);
    assert.equal(moveIn.status, 200);
    assert.equal(moveIn.data.customer.tenantStatus, "Active");
    const moveOut = await api.post(`/crm/customers/${approved.data.customer.id}/move-out`, { moveOutDate: "2027-01-31", reason: "Relocation" }, owner);
    assert.equal(moveOut.status, 200);
    assert.equal(moveOut.data.customer.tenantStatus, "Inactive");
    const bedReleased = moveOut.data.property.rooms.find((r: any) => r.id === room.id).beds.find((b: any) => b.id === bed.id);
    assert.equal(bedReleased.isOccupied, false);
  });

  test("tenant can cancel their own pending booking and it releases nothing that was not reserved", async () => {
    const { property, room, bed } = await findFreeBed();
    const booking = await api.post("/tenant/bookings", { propertyId: property.id, roomId: room.id, bedId: bed.id, moveInDate: "2026-12-01", tenantPhone: "+91 98450 12345" }, tenant);
    assert.equal(booking.status, 201);
    const other = await api.post("/auth/register", { email: "third.tenant@example.com", password: "Strong123", fullName: "Third Tenant" });
    assert.equal((await api.post(`/tenant/bookings/${booking.data.booking.id}/cancel`, {}, other.data.token)).status, 404, "another tenant cannot cancel it");
    const cancelled = await api.post(`/tenant/bookings/${booking.data.booking.id}/cancel`, { reason: "Changed plans" }, tenant);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.data.status, "cancelled");
  });

  test("owners cannot touch another owner's bookings or properties", async () => {
    const marketplaceProp = (await api.get("/properties/public")).data.find((p: any) => p.ownerId === "owner-marketplace");
    assert.ok(marketplaceProp);
    const update = await api.put(`/properties/owner/${marketplaceProp.id}`, { name: "Hijacked" }, owner);
    assert.equal(update.status, 404);
    const bed = await api.patch(`/properties/owner/${marketplaceProp.id}/beds`, { roomId: "x", bedId: "y", isOccupied: true }, owner);
    assert.equal(bed.status, 404);
  });

  test("online rent payment is idempotent", async () => {
    const key = `rent-${Date.now()}`;
    const first = await api.post("/tenant/payments", { amount: 15000, type: "Rent", idempotencyKey: key }, tenant);
    const second = await api.post("/tenant/payments", { amount: 15000, type: "Rent", idempotencyKey: key }, tenant);
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.equal(first.data.id, second.data.id);
  });
});
