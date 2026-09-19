export interface FeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CityItem {
  id: string;
  name: string;
  stays: string;
  image: string;
  landmarks?: string[];
  description?: string;
  avgPrice?: string;
  state?: string;
  verifiedCount?: number;
  startingRent?: number;
  avgRentNum?: number;
  lowestRent?: number;
  highestRent?: number;
  availableBeds?: number;
  occupancyRate?: number;
  weather?: string;
  studentScore?: number;
  proScore?: number;
  popularLocalities?: string[];
  popularColleges?: string[];
  popularCompanies?: string[];
  nearbyTransit?: {
    metro?: string;
    airport?: string;
    railway?: string;
    bus?: string;
  };
  foodAvailability?: string;
  safetyScore?: number;
  isPopular?: boolean;
  isTechHub?: boolean;
  isStudentHub?: boolean;
  region?: 'South' | 'North' | 'West' | 'East' | 'Central';
  lat?: number;
  lng?: number;
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  city: string;
  avatar: string;
  initials: string;
  text: string;
  rating: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface SearchFilterState {
  location: string;
  moveInDate: string;
  occupants: string;
}

export interface PropertyListing {
  id: string;
  slug?: string;
  title: string;
  name?: string;
  city: string;
  area?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  price: number;
  rent?: number;
  rating: number;
  reviewsCount: number;
  reviews?: number;
  verified: boolean;
  featured?: boolean;
  gender?: 'Boys' | 'Girls' | 'Co-living';
  sharing?: string[];
  food?: boolean;
  amenities?: string[];
  available?: string;
  distance?: string;
  image: string;
  images?: string[];
  description?: string;
  caretaker?: {
    name: string;
    phone: string;
    verified: boolean;
  };
  type?: 'Private Room' | 'Shared Room' | 'Studio PG';
  tags?: string[];
  occupancy?: string;
  location?: string;
}

export type ViewMode = 'grid' | 'list' | 'map';

export interface FindPGFilterState {
  searchQuery: string;
  maxRent: number;
  moveInDate: string;
  maxDistance: number;
  roomTypes: string[];
  foodPreference: 'Any' | 'Veg' | 'Non-veg' | 'Both';
  gender: string;
  selectedAmenities: string[];
  minRating: number;
  verifiedOnly: boolean;
  availableNow: boolean;
  sortBy: 'nearest' | 'price-asc' | 'price-desc' | 'rating-desc';
}

// ----------------------------------------------------
// TENANT / USER SETTINGS & PROFILE TYPES
// ----------------------------------------------------

export interface UserLivingPreferences {
  preferredCity: string;
  preferredArea: string;
  preferredPgType: 'Any' | 'Boys' | 'Girls' | 'Co-Living';
  preferredRoomType: string[];
  budgetMin: number;
  budgetMax: number;
  genderPreference: 'Any' | 'Boys' | 'Girls' | 'Co-Living';
  foodPreference: 'Any' | 'Veg' | 'Non-Veg' | 'Food Included' | 'Self Cooking';
  moveInDate: string;
  acPreference?: 'Any' | 'AC' | 'Non-AC';
  attachedBathroom?: boolean;
  furnishing?: 'Any' | 'Fully Furnished' | 'Semi-Furnished' | 'Unfurnished';
  selectedAmenities?: string[];
}

export interface UserNotificationSettings {
  // Booking Notifications
  bookingConfirmed: boolean;
  bookingCancelled: boolean;
  bookingUpdates: boolean;
  // Payment Notifications
  paymentConfirmation: boolean;
  paymentReminders: boolean;
  refundUpdates: boolean;
  // Visit Notifications
  visitConfirmation: boolean;
  visitReminder: boolean;
  visitCancellation: boolean;
  // Property Notifications
  newPgRecommendations: boolean;
  savedPgUpdates: boolean;
  priceChanges: boolean;
  availabilityAlerts: boolean;
  // Marketing
  offers: boolean;
  promotions: boolean;
  nestinUpdates: boolean;
  // Channels
  emailNotifications: boolean;
  pushNotifications: boolean;
  whatsAppNotifications: boolean;
}

export interface UserPrivacySettings {
  profileVisibility: 'public' | 'private' | 'verified_only';
  personalizedRecommendations: boolean;
  locationBasedRecommendations: boolean;
  dataSharingPreferences: boolean;
}

export interface TenantDocument {
  id: string;
  name: string;
  type: 'govt_id' | 'address_proof' | 'student_id' | 'employment_proof' | 'agreement' | 'other';
  documentNumber?: string;
  fileName: string;
  fileSize?: string;
  uploadedAt: string;
  status: 'verified' | 'in_review' | 'pending_upload' | 'rejected';
  rejectionReason?: string;
  fileUrl?: string;
}

export interface TenantBookingItem {
  id: string;
  bookingNumber: string;
  pgId: string;
  pgName: string;
  pgSlug?: string;
  location: string;
  city: string;
  roomType: string;
  sharingType: string;
  checkInDate: string;
  checkOutDate?: string;
  monthlyRent: number;
  depositAmount: number;
  paidAmount: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  image: string;
  ownerName?: string;
  ownerPhone?: string;
  bedNumber?: string;
  roomNumber?: string;
  amenitiesIncluded?: string[];
  cancellationReason?: string;
}

export interface TenantPaymentItem {
  id: string;
  transactionId: string;
  bookingId?: string;
  pgName: string;
  amount: number;
  type: 'Rent' | 'Security Deposit' | 'Token Booking' | 'Maintenance' | 'Electricity';
  date: string;
  paymentMethod: 'UPI / GPay' | 'Credit Card' | 'Debit Card' | 'Net Banking';
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  receiptUrl?: string;
  month?: string;
  invoiceNumber: string;
}

export interface TenantSupportTicket {
  id: string;
  ticketNumber?: string;
  subject: string;
  category: string;
  description?: string;
  pgName?: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'low' | 'medium' | 'high';
  messages?: {
    id?: string;
    sender: 'user' | 'support';
    senderName?: string;
    text?: string;
    message?: string;
    timestamp: string;
  }[];
  responses?: { sender: 'user' | 'support'; message: string; timestamp: string }[];
}
