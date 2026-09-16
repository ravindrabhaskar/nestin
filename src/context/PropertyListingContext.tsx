import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  OwnerPropertyListing,
  PropertyListingStatus,
  PropertyRoom,
  RoomBed,
  PropertyResidentReview,
  PropertyDocument,
} from '../types/property';
import { INITIAL_PROPERTIES_SEED } from '../data/canonicalPropertiesSeed';
import { PropertyListing } from '../types';

interface PropertyListingContextType {
  properties: OwnerPropertyListing[];
  publishedProperties: OwnerPropertyListing[];
  ownerProperties: OwnerPropertyListing[];
  getPropertyById: (id: string) => OwnerPropertyListing | null;
  getPropertyBySlug: (slug: string) => OwnerPropertyListing | null;
  createProperty: (data: Partial<OwnerPropertyListing>) => string;
  updateProperty: (id: string, updates: Partial<OwnerPropertyListing>) => void;
  deleteProperty: (id: string) => void;
  duplicateProperty: (id: string) => string;
  archiveProperty: (id: string) => void;
  submitForVerification: (id: string) => { success: boolean; message: string; missingFields?: string[] };
  adminApproveProperty: (id: string, options?: { isNestinVerified?: boolean; isFeatured?: boolean; isZeroBrokerage?: boolean }) => void;
  adminRejectProperty: (id: string, reason: string) => void;
  updateBedStatus: (propertyId: string, roomId: string, bedId: string, isOccupied: boolean, occupantName?: string) => void;
  addTenantReview: (propertyId: string, review: Omit<PropertyResidentReview, 'id' | 'date'>) => void;
  bookRoom: (propertyId: string, roomId: string, tenantName: string) => { success: boolean; bookingNumber: string };
  calculateCompleteness: (property: Partial<OwnerPropertyListing>) => { score: number; missing: string[] };
  calculateInitialMoveIn: (property: OwnerPropertyListing, roomOrPrice?: number | PropertyRoom) => {
    monthlyRent: number;
    securityDeposit: number;
    bookingFee: number;
    maintenance: number;
    utilitiesApprox: number;
    totalInitialAmount: number;
  };
  // Mapping for legacy / Find PG PropertyListing format
  toFindPGListing: (prop: OwnerPropertyListing) => PropertyListing;
}

const PropertyListingContext = createContext<PropertyListingContextType | undefined>(undefined);

const STORAGE_KEY = 'nestin_canonical_properties_v2';

export function calculatePropertyCompleteness(prop: Partial<OwnerPropertyListing>): { score: number; missing: string[] } {
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

export const PropertyListingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<OwnerPropertyListing[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_PROPERTIES_SEED;
  });

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
    } catch (e) {
      console.error('Failed to save canonical properties to localStorage', e);
    }
  }, [properties]);

  const publishedProperties = useMemo(() => {
    return properties.filter((p) => p.status === 'published');
  }, [properties]);

  const ownerProperties = useMemo(() => {
    return properties; // Currently active owner
  }, [properties]);

  const getPropertyById = (id: string): OwnerPropertyListing | null => {
    return properties.find((p) => p.id === id) || null;
  };

  const getPropertyBySlug = (slug: string): OwnerPropertyListing | null => {
    if (!slug) return null;
    const clean = slug.toLowerCase().trim();
    return (
      properties.find((p) => p.slug && p.slug.toLowerCase() === clean) ||
      properties.find((p) => p.id.toLowerCase() === clean) ||
      properties.find((p) => {
        const titleSlug = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return titleSlug === clean || clean.startsWith(titleSlug) || titleSlug.startsWith(clean);
      }) ||
      null
    );
  };

  const calculateInitialMoveIn = (
    prop: OwnerPropertyListing,
    roomOrPrice?: number | PropertyRoom
  ) => {
    let monthlyRent = prop.pricing?.minRent || 16500;
    let securityDeposit = 33000;
    let bookingFee = prop.pricing?.bookingFee || 999;
    let maintenance = prop.pricing?.maintenance?.amount || 800;

    if (typeof roomOrPrice === 'number') {
      monthlyRent = roomOrPrice;
      securityDeposit = monthlyRent * 2;
    } else if (roomOrPrice && typeof roomOrPrice === 'object') {
      monthlyRent = roomOrPrice.monthlyRent;
      securityDeposit = roomOrPrice.securityDeposit || monthlyRent * 2;
      bookingFee = roomOrPrice.bookingFee || 999;
      maintenance = roomOrPrice.maintenance || 800;
    } else if (prop.rooms && prop.rooms.length > 0) {
      const primaryRoom = prop.rooms[0];
      monthlyRent = primaryRoom.monthlyRent;
      securityDeposit = primaryRoom.securityDeposit || monthlyRent * 2;
    }

    const utilitiesApprox = (prop.pricing?.electricity?.amount || 0) + (prop.pricing?.water?.amount || 0);
    const totalInitialAmount = monthlyRent + securityDeposit + bookingFee;

    return {
      monthlyRent,
      securityDeposit,
      bookingFee,
      maintenance,
      utilitiesApprox,
      totalInitialAmount,
    };
  };

  const createProperty = (data: Partial<OwnerPropertyListing>): string => {
    const id = `prop-${Date.now()}`;
    const slugName = (data.name || 'new-property').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${slugName}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { score } = calculatePropertyCompleteness(data);

    const newProperty: OwnerPropertyListing = {
      id,
      ownerId: 'owner-current',
      ownerName: 'Paritala Venkata Vaibhav',
      ownerEmail: 'venkatavaibhavparitala@gmail.com',
      slug,
      name: data.name || 'Untitled Property Listing',
      type: data.type || 'Co-living',
      category: data.category || 'Co-ed',
      status: data.status || 'draft',
      completenessScore: score,
      yearEstablished: data.yearEstablished || new Date().getFullYear(),
      floors: data.floors || 3,
      contactNumber: data.contactNumber || '+91 98765 43210',
      propertyEmail: data.propertyEmail || 'owner@nestin.io',
      website: data.website || '',
      shortDescription: data.shortDescription || '',
      longDescription: data.longDescription || '',
      tags: data.tags || ['Co-living', 'Working Professionals'],
      isNestinVerified: false,
      isFeatured: false,
      isZeroBrokerage: true,
      coverImage:
        data.coverImage ||
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
      gallery: data.gallery || [],
      videoTourUrl: data.videoTourUrl || '',
      virtualTour360Url: data.virtualTour360Url || '',
      details: data.details || {
        totalRooms: 10,
        totalBeds: 20,
        totalFloors: 3,
        capacity: 20,
        parkingAvailable: true,
        parkingType: 'Both',
        powerBackup: '24/7 Generator',
        waterSupply: '24/7 RO Purified',
        securityType: 'CCTV & Biometric Access',
        cctv: true,
        biometricAccess: true,
        housekeeping: 'Daily Housekeeping',
        laundry: 'Washing Machines Available',
      },
      rooms: data.rooms || [
        {
          id: `room-${Date.now()}-1`,
          name: 'Double Sharing Standard',
          type: 'Double Sharing',
          sharingTypeSlug: 'double-sharing',
          floor: 1,
          sizeSqFt: 220,
          capacity: 2,
          availableBedsCount: 2,
          occupiedBedsCount: 0,
          bathroomType: 'Attached Bathroom',
          hasAC: true,
          furnishing: 'Fully Furnished',
          monthlyRent: 15000,
          securityDeposit: 30000,
          bookingFee: 999,
          maintenance: 800,
          beds: [
            { id: `bed-${Date.now()}-1a`, bedNumber: 'Bed 101-A', isOccupied: false },
            { id: `bed-${Date.now()}-1b`, bedNumber: 'Bed 101-B', isOccupied: false },
          ],
        },
      ],
      pricing: data.pricing || {
        minRent: 15000,
        securityDepositRefundPolicy: '100% Refundable in 15 days upon notice',
        electricity: { type: 'Metered', amount: 1200, label: '₹1200/mo approx' },
        water: { type: 'Included', amount: 200, label: 'Included' },
        foodMess: { type: 'Included', mealsPerDay: 3, label: 'Included (3 Meals/day)' },
        laundryAndHousekeeping: { type: 'Included', label: 'Included' },
        maintenance: { type: 'Included', amount: 800, label: '₹800/month included' },
        bookingFee: 999,
      },
      amenities: data.amenities || [
        { id: 'am-1', name: 'High-Speed Wi-Fi', category: 'Connectivity', iconKey: 'wifi', isAvailable: true, subtext: '200 Mbps' },
        { id: 'am-2', name: 'Air Conditioning', category: 'Comfort', iconKey: 'ac', isAvailable: true, subtext: 'In all rooms' },
        { id: 'am-3', name: 'Housekeeping', category: 'Housekeeping', iconKey: 'housekeeping', isAvailable: true, subtext: 'Daily' },
        { id: 'am-4', name: 'Power Backup', category: 'Utilities', iconKey: 'power', isAvailable: true, subtext: '24/7' },
      ],
      policies: data.policies || {
        curfew: 'Entry gate locks at 11:00 PM. Late entry permitted with prior notice.',
        visitorPolicy: 'Visitors permitted in common lounge 9 AM - 8 PM.',
        smokingAndAlcohol: 'Strictly zero smoking or alcohol on premises.',
        cancellationPolicy: '30 days notice required prior to vacating.',
        noticePeriod: '30 Days',
        petPolicy: 'No pets allowed.',
        guestPolicy: 'Day visitors allowed in reception lounge.',
        ageRestrictions: '18 - 35 Years',
        genderPolicy: 'Co-ed Living',
        additionalRules: ['Maintain cleanliness in common spaces.'],
      },
      location: data.location || {
        addressLine1: 'Main Road, Near Metro',
        area: 'Madhapur',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        latitude: 17.4483,
        longitude: 78.3748,
        formattedAddress: 'Main Road, Madhapur, Hyderabad, Telangana - 500081',
        distanceLabel: '5.0 km away',
        moveInAvailabilityLabel: 'Available now',
      },
      nearbyPlaces: data.nearbyPlaces || [
        { id: 'nb-1', category: 'Metro', name: 'Madhapur Metro Station', distanceKm: 0.5, travelTime: '6 mins walk', travelMode: 'walk' },
        { id: 'nb-2', category: 'Hospital', name: 'Medicover Hospital', distanceKm: 1.2, travelTime: '5 mins ride', travelMode: 'ride' },
      ],
      caretaker: data.caretaker || {
        name: 'Care Host',
        phone: '+91 98765 43210',
        isIdentityVerified: false,
        isBackgroundVerified: false,
        isPubliclyVisible: true,
      },
      documents: data.documents || [],
      systemMetrics: {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        totalBookingsCount: 0,
        viewsCount: 1,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      },
      reviews: [],
    };

    setProperties((prev) => [newProperty, ...prev]);
    return id;
  };

  const updateProperty = (id: string, updates: Partial<OwnerPropertyListing>) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...updates, systemMetrics: { ...p.systemMetrics, lastUpdatedAt: new Date().toISOString() } };
        const { score } = calculatePropertyCompleteness(merged);
        merged.completenessScore = score;
        return merged;
      })
    );
  };

  const deleteProperty = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const duplicateProperty = (id: string): string => {
    const orig = properties.find((p) => p.id === id);
    if (!orig) return '';
    const newId = `prop-${Date.now()}`;
    const newSlug = `${orig.slug}-copy-${Math.floor(100 + Math.random() * 900)}`;

    const duplicated: OwnerPropertyListing = {
      ...orig,
      id: newId,
      slug: newSlug,
      name: `${orig.name} (Copy)`,
      status: 'draft',
      isNestinVerified: false,
      isFeatured: false,
      systemMetrics: {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        totalBookingsCount: 0,
        viewsCount: 0,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      },
      reviews: [],
    };

    setProperties((prev) => [duplicated, ...prev]);
    return newId;
  };

  const archiveProperty = (id: string) => {
    updateProperty(id, { status: 'archived' });
  };

  const submitForVerification = (id: string): { success: boolean; message: string; missingFields?: string[] } => {
    const prop = properties.find((p) => p.id === id);
    if (!prop) return { success: false, message: 'Property not found' };

    const { score, missing } = calculatePropertyCompleteness(prop);
    if (score < 70) {
      return {
        success: false,
        message: `Listing is only ${score}% complete. Please provide required fields before submitting for review.`,
        missingFields: missing,
      };
    }

    updateProperty(id, {
      status: 'pending_approval',
      rejectionReason: undefined,
    });

    return {
      success: true,
      message: 'Property successfully submitted for verification & review!',
    };
  };

  const adminApproveProperty = (
    id: string,
    options?: { isNestinVerified?: boolean; isFeatured?: boolean; isZeroBrokerage?: boolean }
  ) => {
    updateProperty(id, {
      status: 'published',
      isNestinVerified: options?.isNestinVerified ?? true,
      isFeatured: options?.isFeatured ?? false,
      isZeroBrokerage: options?.isZeroBrokerage ?? true,
      rejectionReason: undefined,
      caretaker: {
        ...properties.find((p) => p.id === id)?.caretaker!,
        isIdentityVerified: true,
        isBackgroundVerified: true,
        isPubliclyVisible: true,
      },
      documents: properties
        .find((p) => p.id === id)
        ?.documents.map((d) => ({ ...d, status: 'verified' as const })) || [],
      systemMetrics: {
        ...properties.find((p) => p.id === id)?.systemMetrics!,
        publishedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      },
    });
  };

  const adminRejectProperty = (id: string, reason: string) => {
    updateProperty(id, {
      status: 'rejected',
      rejectionReason: reason || 'Incomplete verification documents or incorrect address details.',
    });
  };

  const updateBedStatus = (
    propertyId: string,
    roomId: string,
    bedId: string,
    isOccupied: boolean,
    occupantName?: string
  ) => {
    setProperties((prev) =>
      prev.map((prop) => {
        if (prop.id !== propertyId) return prop;
        const updatedRooms = prop.rooms.map((room) => {
          if (room.id !== roomId) return room;
          const updatedBeds = room.beds.map((bed) => {
            if (bed.id !== bedId) return bed;
            return {
              ...bed,
              isOccupied,
              occupantName: isOccupied ? occupantName || 'Tenant' : undefined,
            };
          });
          const occCount = updatedBeds.filter((b) => b.isOccupied).length;
          const availCount = updatedBeds.length - occCount;
          return {
            ...room,
            beds: updatedBeds,
            occupiedBedsCount: occCount,
            availableBedsCount: availCount,
          };
        });

        // Recalculate property overview details
        const totalBeds = updatedRooms.reduce((acc, r) => acc + r.beds.length, 0);
        const occupiedBeds = updatedRooms.reduce((acc, r) => acc + r.occupiedBedsCount, 0);

        return {
          ...prop,
          rooms: updatedRooms,
          details: {
            ...prop.details,
            totalBeds: totalBeds || prop.details.totalBeds,
            capacity: totalBeds || prop.details.capacity,
          },
        };
      })
    );
  };

  const addTenantReview = (propertyId: string, review: Omit<PropertyResidentReview, 'id' | 'date'>) => {
    setProperties((prev) =>
      prev.map((prop) => {
        if (prop.id !== propertyId) return prop;
        const newReview: PropertyResidentReview = {
          ...review,
          id: `rev-${Date.now()}`,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        };
        const allReviews = [newReview, ...prop.reviews];
        const avg = Number((allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length).toFixed(1));

        return {
          ...prop,
          reviews: allReviews,
          systemMetrics: {
            ...prop.systemMetrics,
            averageRating: avg,
            totalReviews: allReviews.length,
          },
        };
      })
    );
  };

  const bookRoom = (propertyId: string, roomId: string, tenantName: string) => {
    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) return { success: false, bookingNumber: '' };

    const targetRoom = prop.rooms.find((r) => r.id === roomId) || prop.rooms[0];
    if (!targetRoom) return { success: false, bookingNumber: '' };

    // Find first available bed
    const availableBed = targetRoom.beds.find((b) => !b.isOccupied) || targetRoom.beds[0];
    if (availableBed) {
      updateBedStatus(propertyId, targetRoom.id, availableBed.id, true, tenantName);
    }

    const bookingNumber = `NST-${Math.floor(100000 + Math.random() * 900000)}`;

    // Update property stats
    setProperties((prev) =>
      prev.map((p) =>
        p.id === propertyId
          ? {
              ...p,
              systemMetrics: {
                ...p.systemMetrics,
                totalBookingsCount: p.systemMetrics.totalBookingsCount + 1,
              },
            }
          : p
      )
    );

    return { success: true, bookingNumber };
  };

  const toFindPGListing = (prop: OwnerPropertyListing): PropertyListing => {
    const minRent =
      prop.rooms && prop.rooms.length > 0
        ? Math.min(...prop.rooms.map((r) => r.monthlyRent))
        : prop.pricing?.minRent || 15000;

    const availableBeds = prop.rooms.reduce((acc, r) => acc + r.availableBedsCount, 0);
    const availableLabel = availableBeds > 0 ? `${availableBeds} beds available` : 'Available now';

    return {
      id: prop.id,
      slug: prop.slug,
      title: prop.name,
      name: prop.name,
      city: prop.location.city,
      area: prop.location.area,
      address: prop.location.addressLine1,
      latitude: prop.location.latitude,
      longitude: prop.location.longitude,
      price: minRent,
      rent: minRent,
      rating: prop.systemMetrics.averageRating || 4.8,
      reviewsCount: prop.systemMetrics.totalReviews || 120,
      reviews: prop.systemMetrics.totalReviews || 120,
      verified: prop.isNestinVerified,
      featured: prop.isFeatured,
      gender: prop.category === 'Men' ? 'Boys' : prop.category === 'Women' ? 'Girls' : 'Co-living',
      sharing: prop.rooms.map((r) => r.type.replace(' Sharing', '')),
      food: prop.pricing.foodMess.type === 'Included',
      amenities: prop.amenities.filter((a) => a.isAvailable).map((a) => a.name),
      available: availableLabel,
      distance: prop.location.distanceLabel || 'Near Transit',
      image: prop.coverImage,
      images: prop.gallery.map((g) => g.url),
      description: prop.shortDescription || prop.longDescription,
      caretaker: {
        name: prop.caretaker.name,
        phone: prop.caretaker.phone,
        verified: prop.caretaker.isIdentityVerified,
      },
      type: prop.type === 'Co-living' ? 'Private Room' : prop.type === 'Hostel' ? 'Shared Room' : 'Studio PG',
      tags: prop.tags,
      occupancy: prop.rooms.map((r) => r.type).join(' · '),
      location: prop.location.formattedAddress,
    };
  };

  return (
    <PropertyListingContext.Provider
      value={{
        properties,
        publishedProperties,
        ownerProperties,
        getPropertyById,
        getPropertyBySlug,
        createProperty,
        updateProperty,
        deleteProperty,
        duplicateProperty,
        archiveProperty,
        submitForVerification,
        adminApproveProperty,
        adminRejectProperty,
        updateBedStatus,
        addTenantReview,
        bookRoom,
        calculateCompleteness: calculatePropertyCompleteness,
        calculateInitialMoveIn,
        toFindPGListing,
      }}
    >
      {children}
    </PropertyListingContext.Provider>
  );
};

export const usePropertyListing = (): PropertyListingContextType => {
  const context = useContext(PropertyListingContext);
  if (!context) {
    throw new Error('usePropertyListing must be used within a PropertyListingProvider');
  }
  return context;
};
