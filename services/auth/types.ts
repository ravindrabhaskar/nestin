export type AppRole = "owner" | "employee" | "tenant" | "admin" | "super_admin";

export interface UserLivingPreferences {
  preferredCity?: string;
  preferredArea?: string;
  preferredPgType?: string;
  preferredRoomType?: string[];
  budgetMin?: number;
  budgetMax?: number;
  genderPreference?: string;
  foodPreference?: string;
  moveInDate?: string;
  acPreference?: string;
  attachedBathroom?: boolean;
  furnishing?: string;
  selectedAmenities?: string[];
}

export interface UserNotificationSettings {
  bookingConfirmed?: boolean;
  bookingCancelled?: boolean;
  bookingUpdates?: boolean;
  paymentConfirmation?: boolean;
  paymentReminders?: boolean;
  refundUpdates?: boolean;
  visitConfirmation?: boolean;
  visitReminder?: boolean;
  visitCancellation?: boolean;
  newPgRecommendations?: boolean;
  savedPgUpdates?: boolean;
  priceChanges?: boolean;
  availabilityAlerts?: boolean;
  offers?: boolean;
  promotions?: boolean;
  nestinUpdates?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  whatsAppNotifications?: boolean;
}

export interface UserPrivacySettings {
  profileVisibility?: "verified_only" | "public" | "private";
  personalizedRecommendations?: boolean;
  locationBasedRecommendations?: boolean;
  dataSharingPreferences?: boolean;
}

export interface TenantDocument {
  id: string;
  name: string;
  type: string;
  documentNumber: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: "verified" | "in_review" | "rejected";
}

export interface AuthUser {
  id: string;
  email: string;
  passwordHash?: string;
  role: AppRole;
  roles?: AppRole[];
  fullName: string;
  phone?: string;
  avatar?: string;
  city?: string;
  dob?: string;
  gender?: "Male" | "Female" | "Other" | "Prefer not to say";
  occupation?: "Student" | "Working Professional" | "Job Seeker" | "Intern" | "Other";
  collegeOrCompany?: string;
  bio?: string;
  language?: string;
  ownerId?: string;
  authorityLevel?: "full" | "high" | "medium" | "low" | "limited";
  permissions?: string[];
  authProvider?: "email" | "google" | "super_admin_portal" | "system";
  createdAt: string;
  updatedAt?: string;
  livingPreferences?: UserLivingPreferences;
  notificationSettings?: UserNotificationSettings;
  privacySettings?: UserPrivacySettings;
  documents?: TenantDocument[];
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  createdAt: string;
  isValid: boolean;
  isCurrent?: boolean;
}

export interface JwtTokenPayload {
  id: string;
  email: string;
  role: AppRole;
  fullName: string;
  ownerId?: string;
  authorityLevel?: string;
  permissions?: string[];
  sessionId?: string;
  iat: number;
  exp: number;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: Omit<AuthUser, "passwordHash">;
  session?: UserSession;
  error?: string;
}
