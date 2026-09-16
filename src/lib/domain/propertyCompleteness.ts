import type { OwnerPropertyListing } from '../../types/property';

/**
 * Listing completeness score (0-100) and the list of missing sections. Shared by the owner
 * dashboard (progress UI) and the API server (submission gate), so both agree on the rules.
 */
export function calculatePropertyCompleteness(prop: Partial<OwnerPropertyListing>): {
  score: number;
  missing: string[];
} {
  const missing: string[] = [];
  let points = 0;
  const maxPoints = 100;

  // Step 1: Basic Info (15 pts)
  if (prop.name && prop.name.trim().length > 2) points += 5;
  else missing.push('Property Name');

  if (prop.type && prop.category) points += 5;
  else missing.push('Property Type & Category');

  if (prop.shortDescription || prop.longDescription) points += 5;
  else missing.push('Property Description');

  // Step 2: Photos & Media (20 pts)
  if (prop.coverImage) points += 10;
  else missing.push('Cover Image');

  if (prop.gallery && prop.gallery.length >= 3) points += 10;
  else if (prop.gallery && prop.gallery.length > 0) points += 5;
  else missing.push('At least 3 Gallery Photos');

  // Step 3 & 4: Rooms & Beds (20 pts)
  if (prop.rooms && prop.rooms.length > 0) {
    points += 15;
    const hasConfiguredBeds = prop.rooms.some((r) => r.beds && r.beds.length > 0);
    if (hasConfiguredBeds) points += 5;
  } else {
    missing.push('Room & Bed Configurations');
  }

  // Step 5: Pricing (15 pts)
  if (prop.rooms && prop.rooms.some((r) => r.monthlyRent > 0)) points += 10;
  else missing.push('Room Pricing & Rates');

  if (prop.pricing?.securityDepositRefundPolicy) points += 5;
  else missing.push('Deposit Refund Policy');

  // Step 6: Amenities (10 pts)
  if (prop.amenities && prop.amenities.filter((a) => a.isAvailable).length >= 3) points += 10;
  else missing.push('At least 3 Amenities');

  // Step 7: Policies (5 pts)
  if (prop.policies?.curfew || prop.policies?.visitorPolicy || prop.policies?.cancellationPolicy) points += 5;
  else missing.push('House Rules & Policies');

  // Step 8: Location (10 pts)
  if (prop.location?.addressLine1 && prop.location?.city && prop.location?.pincode) points += 10;
  else missing.push('Complete Address & City');

  // Step 10 & 11: Caretaker & Docs (5 pts)
  if (prop.caretaker?.name && prop.caretaker?.phone) points += 5;
  else missing.push('Caretaker Contact Information');

  return {
    score: Math.min(100, Math.round((points / maxPoints) * 100)),
    missing,
  };
}
