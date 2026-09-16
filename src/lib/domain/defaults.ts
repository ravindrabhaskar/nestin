import type { UserLivingPreferences, UserNotificationSettings, UserPrivacySettings } from '../../types';

/** Default preference values for new accounts. Shared by the client (forms) and the API server (seeding). */

export const DEFAULT_LIVING_PREFERENCES: UserLivingPreferences = {
  preferredCity: 'Hyderabad',
  preferredArea: 'Kukatpally / Hitec City',
  preferredPgType: 'Co-Living',
  preferredRoomType: ['Single', 'Double'],
  budgetMin: 6000,
  budgetMax: 16000,
  genderPreference: 'Co-Living',
  foodPreference: 'Food Included',
  moveInDate: '2026-09-01',
  acPreference: 'AC',
  attachedBathroom: true,
  furnishing: 'Fully Furnished',
  selectedAmenities: ['High-Speed WiFi', 'Daily Housekeeping', 'Power Backup', 'Washing Machine', 'RO Drinking Water', 'CCTV Security'],
};

export const DEFAULT_NOTIFICATION_SETTINGS: UserNotificationSettings = {
  bookingConfirmed: true,
  bookingCancelled: true,
  bookingUpdates: true,
  paymentConfirmation: true,
  paymentReminders: true,
  refundUpdates: true,
  visitConfirmation: true,
  visitReminder: true,
  visitCancellation: true,
  newPgRecommendations: true,
  savedPgUpdates: true,
  priceChanges: true,
  availabilityAlerts: true,
  offers: false,
  promotions: false,
  nestinUpdates: true,
  emailNotifications: true,
  pushNotifications: true,
  whatsAppNotifications: true,
};

export const DEFAULT_PRIVACY_SETTINGS: UserPrivacySettings = {
  profileVisibility: 'verified_only',
  personalizedRecommendations: true,
  locationBasedRecommendations: true,
  dataSharingPreferences: true,
};
