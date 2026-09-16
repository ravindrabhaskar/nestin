import { events } from "../lib/events.js";
import { properties, users } from "../db/repositories.js";
import { notifyUser } from "./crmService.js";

/**
 * Event-driven notification fan-out. Handlers run asynchronously after the originating request
 * has completed, so a failure here never fails the user's action.
 *
 * Channels beyond in-app (email / WhatsApp / push) plug in here: read the user's notification
 * settings and dispatch through the configured provider.
 */

events.subscribe<{ score: number }>("PropertySubmittedForReview", (event) => {
  for (const admin of users.list({ role: "super_admin" })) {
    const prop = properties.get(event.aggregateId);
    notifyUser(admin.id, {
      title: "Listing awaiting verification",
      message: `${prop?.name || "A property"} was submitted for review by ${prop?.ownerName || "an owner"}.`,
      type: "system",
      linkTo: "/admin",
    });
  }
});

events.subscribe("PropertyApproved", (event) => {
  const prop = properties.get(event.aggregateId);
  if (!prop) return;
  notifyUser(prop.ownerId, {
    title: "Listing approved & live 🎉",
    message: `${prop.name} passed verification and is now visible to residents on NestIn.`,
    type: "system",
    linkTo: "/owner/properties",
  });
});

events.subscribe<{ reason: string }>("PropertyRejected", (event) => {
  const prop = properties.get(event.aggregateId);
  if (!prop) return;
  notifyUser(prop.ownerId, {
    title: "Listing needs changes",
    message: `${prop.name} was not approved: ${event.payload.reason}`,
    type: "system",
    linkTo: "/owner/properties",
  });
});

events.subscribe<{ rating: number }>("ReviewAdded", (event) => {
  const prop = properties.get(event.aggregateId);
  if (!prop) return;
  notifyUser(prop.ownerId, {
    title: "New resident review",
    message: `${prop.name} received a ${event.payload.rating}-star review.`,
    type: "system",
    linkTo: "/owner/properties",
  });
});
