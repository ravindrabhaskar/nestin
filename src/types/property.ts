export type PropertyType = 'PG' | 'Hostel' | 'Co-living' | 'Student Housing' | 'Working Professionals';
export type PropertyCategory = 'Men' | 'Women' | 'Co-ed';
export type PropertyListingStatus = 'draft' | 'pending_approval' | 'published' | 'rejected' | 'archived';

export interface RoomBed {
  id: string;
  bedNumber: string;
  isOccupied: boolean;
  occupantName?: string;
  occupantGender?: string;
  moveInDate?: string;
}

export interface PropertyRoom {
  id: string;
  name: string; // e.g. "Room 101"
  type: 'Single Sharing' | 'Double Sharing' | 'Triple Sharing' | 'Four Sharing' | 'Dormitory' | 'Custom';
  sharingTypeSlug: string;
  floor: number;
  sizeSqFt: number;
  capacity: number;
  availableBedsCount: number;
  occupiedBedsCount: number;
  bathroomType: 'Attached Bathroom' | 'Common Washroom';
  hasAC: boolean;
  hasBalcony?: boolean;
  furnishing: 'Fully Furnished' | 'Semi-Furnished' | 'Unfurnished';
  monthlyRent: number;
  securityDeposit: number;
  bookingFee: number;
  maintenance: number;
  beds: RoomBed[];
}

export interface PropertyMediaItem {
  id: string;
  url: string;
  title: string;
  category: 'Exterior' | 'Living Area' | 'Bedrooms' | 'Bathrooms' | 'Kitchen' | 'Dining' | 'Common Areas' | 'Study Area' | 'Gym' | 'Parking' | 'Other';
  isCover?: boolean;
}

export interface PropertyNearbyPlace {
  id: string;
  category: 'Metro' | 'Bus Stop' | 'College' | 'University' | 'Company' | 'Hospital' | 'Mall' | 'ATM' | 'Restaurant' | 'Medical Store' | 'Other';
  name: string;
  distanceKm: number;
  travelTime: string;
  travelMode: 'walk' | 'ride' | 'drive';
}

export interface PropertyDocument {
  id: string;
  title: string;
  type: 'ownership_proof' | 'registration' | 'govt_id' | 'address_proof' | 'pg_license' | 'fire_safety' | 'other';
  fileUrl: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
}

export interface PropertyAmenityItem {
  id: string;
  name: string;
  category: 'Connectivity' | 'Comfort' | 'Housekeeping' | 'Security' | 'Utilities' | 'Lifestyle' | 'Food' | 'Other';
  iconKey?: string;
  subtext?: string;
  isAvailable: boolean;
}

export interface PropertyResidentReview {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  helpfulCount: number;
  verifiedResident: boolean;
  residentRoom: string;
  images?: string[];
}

export interface OwnerPropertyListing {
  id: string;
  /** True when this record is a lightweight catalogue projection (reviews, policies, gallery trimmed). */
  summary?: boolean;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  slug: string;
  name: string;
  type: PropertyType;
  category: PropertyCategory;
  status: PropertyListingStatus;
  rejectionReason?: string;
  completenessScore: number;
  
  // Basic info
  yearEstablished?: number;
  floors: number;
  contactNumber: string;
  propertyEmail: string;
  website?: string;
  shortDescription: string;
  longDescription: string;
  tags: string[];

  // Platform Verification Controlled Badges
  isNestinVerified: boolean;
  isFeatured: boolean;
  isZeroBrokerage: boolean;

  // Media
  coverImage: string;
  gallery: PropertyMediaItem[];
  videoTourUrl?: string;
  virtualTour360Url?: string;

  // Overview specs
  details: {
    totalRooms: number;
    totalBeds: number;
    totalFloors: number;
    capacity: number;
    parkingAvailable: boolean;
    parkingType: '2-Wheeler' | '4-Wheeler' | 'Both' | 'None';
    powerBackup: string;
    waterSupply: string;
    securityType: string;
    cctv: boolean;
    biometricAccess: boolean;
    housekeeping: string;
    laundry: string;
  };

  // Inventory
  rooms: PropertyRoom[];

  // Pricing & Breakdown
  pricing: {
    minRent: number;
    securityDepositRefundPolicy: string;
    electricity: { type: 'Metered' | 'Included' | 'Fixed'; amount?: number; label: string };
    water: { type: 'Included' | 'Additional'; amount?: number; label: string };
    foodMess: { type: 'Included' | 'Optional' | 'Not Available'; mealsPerDay?: number; label: string };
    laundryAndHousekeeping: { type: 'Included' | 'Additional'; label: string };
    maintenance: { type: 'Included' | 'Additional'; amount: number; label: string };
    bookingFee: number;
  };

  // Amenities
  amenities: PropertyAmenityItem[];

  // House Rules
  policies: {
    curfew: string;
    visitorPolicy: string;
    smokingAndAlcohol: string;
    cancellationPolicy: string;
    noticePeriod: string;
    petPolicy: string;
    guestPolicy: string;
    ageRestrictions: string;
    genderPolicy: string;
    additionalRules: string[];
  };

  // Location
  location: {
    addressLine1: string;
    addressLine2?: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    formattedAddress: string;
    distanceLabel?: string;
    moveInAvailabilityLabel?: string;
  };

  // Nearby
  nearbyPlaces: PropertyNearbyPlace[];

  // Caretaker
  caretaker: {
    name: string;
    phone: string;
    email?: string;
    emergencyContact?: string;
    isIdentityVerified: boolean; // system-controlled
    isBackgroundVerified: boolean; // system-controlled
    isPubliclyVisible: boolean;
  };

  // Documents
  documents: PropertyDocument[];

  // System-generated metrics
  systemMetrics: {
    averageRating: number;
    totalReviews: number;
    ratingBreakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
    totalBookingsCount: number;
    viewsCount: number;
    publishedAt?: string;
    lastUpdatedAt: string;
    createdAt: string;
  };

  // Reviews
  reviews: PropertyResidentReview[];
}
