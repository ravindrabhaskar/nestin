import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { OwnerPropertyListing, PropertyRoom, PropertyResidentReview } from '../types/property';
import { PropertyListing } from '../types';
import { calculatePropertyCompleteness } from '../lib/domain/propertyCompleteness';
import { ApiClient } from '../lib/apiClient';
import { reportSyncError, syncBus } from '../lib/syncBus';
import { useAuth } from './AuthContext';

interface PropertyListingContextType {
  properties: OwnerPropertyListing[];
  publishedProperties: OwnerPropertyListing[];
  ownerProperties: OwnerPropertyListing[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  getPropertyById: (id: string) => OwnerPropertyListing | null;
  getPropertyBySlug: (slug: string) => OwnerPropertyListing | null;
  /** Fetches a listing that is not in the local cache (deep links, cross-owner previews). */
  fetchPropertyBySlug: (slug: string) => Promise<OwnerPropertyListing | null>;
  createProperty: (data: Partial<OwnerPropertyListing>) => string;
  updateProperty: (id: string, updates: Partial<OwnerPropertyListing>) => void;
  deleteProperty: (id: string) => void;
  duplicateProperty: (id: string) => string;
  archiveProperty: (id: string) => void;
  submitForVerification: (id: string) => { success: boolean; message: string; missingFields?: string[] };
  adminApproveProperty: (
    id: string,
    options?: { isNestinVerified?: boolean; isFeatured?: boolean; isZeroBrokerage?: boolean }
  ) => void;
  adminRejectProperty: (id: string, reason: string) => void;
  updateBedStatus: (
    propertyId: string,
    roomId: string,
    bedId: string,
    isOccupied: boolean,
    occupantName?: string
  ) => void;
  addTenantReview: (propertyId: string, review: Omit<PropertyResidentReview, 'id' | 'date'>) => void;
  /** Tenant books a bed online; returns the server booking (server picks a free bed when none is given). */
  bookRoom: (
    propertyId: string,
    roomId: string,
    tenantName: string,
    options?: { bedId?: string; moveInDate?: string; phone?: string; durationMonths?: number }
  ) => Promise<{ success: boolean; bookingNumber: string; bookingId?: string; error?: string }>;
  calculateCompleteness: (property: Partial<OwnerPropertyListing>) => { score: number; missing: string[] };
  calculateInitialMoveIn: (
    property: OwnerPropertyListing,
    roomOrPrice?: number | PropertyRoom
  ) => {
    monthlyRent: number;
    securityDeposit: number;
    bookingFee: number;
    maintenance: number;
    utilitiesApprox: number;
    totalInitialAmount: number;
  };
  toFindPGListing: (prop: OwnerPropertyListing) => PropertyListing;
}

const PropertyListingContext = createContext<PropertyListingContextType | undefined>(undefined);

export { calculatePropertyCompleteness };

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Merges a list of listings into the cache, replacing by id. */
function mergeInto(
  prev: OwnerPropertyListing[],
  incoming: OwnerPropertyListing[],
  replaceScope?: (p: OwnerPropertyListing) => boolean
): OwnerPropertyListing[] {
  const base = replaceScope ? prev.filter((p) => !replaceScope(p)) : prev;
  const map = new Map(base.map((p) => [p.id, p]));
  for (const p of incoming) map.set(p.id, p);
  return Array.from(map.values());
}

export const PropertyListingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isSuperAdmin, isOwner, isEmployee, isLoading: authLoading } = useAuth();
  const [properties, setProperties] = useState<OwnerPropertyListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;

  const ownerId = isOwner ? user?.id : isEmployee ? user?.ownerId : null;

  const refresh = useCallback(async () => {
    try {
      const requests: Promise<OwnerPropertyListing[]>[] = [ApiClient.properties.listPublic()];
      if (isSuperAdmin) requests.push(ApiClient.admin.properties());
      else if (ownerId) requests.push(ApiClient.properties.listOwner());
      const [published, privileged = []] = await Promise.all(requests);
      // Privileged lists are authoritative for their scope; public listings fill in the rest.
      setProperties(() => mergeInto(published, privileged, isSuperAdmin ? () => true : (p) => p.ownerId === ownerId));
    } catch (err) {
      reportSyncError('Could not load properties', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin, ownerId]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh, isAuthenticated]);

  const publishedProperties = useMemo(() => properties.filter((p) => p.status === 'published'), [properties]);
  const ownerProperties = useMemo(
    () => (ownerId ? properties.filter((p) => p.ownerId === ownerId) : []),
    [properties, ownerId]
  );

  const upsertLocal = useCallback((listing: OwnerPropertyListing) => {
    setProperties((prev) => mergeInto(prev, [listing]));
  }, []);

  const getPropertyById = useCallback((id: string) => properties.find((p) => p.id === id) || null, [properties]);

  const getPropertyBySlug = useCallback(
    (slug: string): OwnerPropertyListing | null => {
      if (!slug) return null;
      const clean = slug.toLowerCase().trim();
      return (
        properties.find((p) => p.slug && p.slug.toLowerCase() === clean) ||
        properties.find((p) => p.id.toLowerCase() === clean) ||
        properties.find((p) => {
          const titleSlug = (p.name || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          return titleSlug === clean || clean.startsWith(titleSlug) || titleSlug.startsWith(clean);
        }) ||
        null
      );
    },
    [properties]
  );

  const fetchPropertyBySlug = useCallback(
    async (slug: string) => {
      try {
        const listing = await ApiClient.properties.getPublic(slug);
        if (listing) upsertLocal(listing);
        return listing || null;
      } catch {
        return null;
      }
    },
    [upsertLocal]
  );

  const calculateInitialMoveIn = (prop: OwnerPropertyListing, roomOrPrice?: number | PropertyRoom) => {
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
    return {
      monthlyRent,
      securityDeposit,
      bookingFee,
      maintenance,
      utilitiesApprox,
      totalInitialAmount: monthlyRent + securityDeposit + bookingFee,
    };
  };

  /** Builds a complete draft listing from partial wizard data (defaults mirror the wizard's suggested values). */
  const buildDraft = (data: Partial<OwnerPropertyListing>, id: string): OwnerPropertyListing => {
    const slugName = (data.name || 'new-property')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const now = new Date().toISOString();
    const roomId = uid('room');
    const draft: OwnerPropertyListing = {
      id,
      ownerId: ownerId || 'owner',
      ownerName: user?.name || 'Owner',
      ownerEmail: user?.email || '',
      slug: `${slugName}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: data.name || 'Untitled Property Listing',
      type: data.type || 'Co-living',
      category: data.category || 'Co-ed',
      status: 'draft',
      completenessScore: 0,
      yearEstablished: data.yearEstablished || new Date().getFullYear(),
      floors: data.floors || 3,
      contactNumber: data.contactNumber || user?.phone || '',
      propertyEmail: data.propertyEmail || user?.email || '',
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
          id: roomId,
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
            { id: uid('bed'), bedNumber: 'Bed 101-A', isOccupied: false },
            { id: uid('bed'), bedNumber: 'Bed 101-B', isOccupied: false },
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
        {
          id: 'am-1',
          name: 'High-Speed Wi-Fi',
          category: 'Connectivity',
          iconKey: 'wifi',
          isAvailable: true,
          subtext: '200 Mbps',
        },
        {
          id: 'am-2',
          name: 'Air Conditioning',
          category: 'Comfort',
          iconKey: 'ac',
          isAvailable: true,
          subtext: 'In all rooms',
        },
        {
          id: 'am-3',
          name: 'Housekeeping',
          category: 'Housekeeping',
          iconKey: 'housekeeping',
          isAvailable: true,
          subtext: 'Daily',
        },
        {
          id: 'am-4',
          name: 'Power Backup',
          category: 'Utilities',
          iconKey: 'power',
          isAvailable: true,
          subtext: '24/7',
        },
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
        addressLine1: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        latitude: 17.4483,
        longitude: 78.3748,
        formattedAddress: '',
        distanceLabel: '',
        moveInAvailabilityLabel: 'Available now',
      },
      nearbyPlaces: data.nearbyPlaces || [],
      caretaker: data.caretaker || {
        name: '',
        phone: '',
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
        viewsCount: 0,
        createdAt: now,
        lastUpdatedAt: now,
      },
      reviews: [],
    };
    draft.completenessScore = calculatePropertyCompleteness(draft).score;
    return draft;
  };

  const createProperty = (data: Partial<OwnerPropertyListing>): string => {
    const id = uid('prop');
    const draft = buildDraft(data, id);
    setProperties((prev) => [draft, ...prev]);
    ApiClient.properties
      .create(draft as unknown as Record<string, unknown>)
      .then(upsertLocal)
      .catch((err) => {
        setProperties((prev) => prev.filter((p) => p.id !== id));
        reportSyncError('Could not create the listing', err);
      });
    return id;
  };

  const updateProperty = (id: string, updates: Partial<OwnerPropertyListing>) => {
    const current = propertiesRef.current.find((p) => p.id === id);
    if (!current) return;
    const optimistic = {
      ...current,
      ...updates,
      systemMetrics: { ...current.systemMetrics, lastUpdatedAt: new Date().toISOString() },
    };
    optimistic.completenessScore = calculatePropertyCompleteness(optimistic).score;
    upsertLocal(optimistic);
    ApiClient.properties
      .update(id, updates as Record<string, unknown>)
      .then((saved) => {
        upsertLocal(saved);
        if (saved.status === 'pending_approval' && current.status === 'published') {
          syncBus.publish('info', 'Your published listing was updated and sent for re-verification.');
        }
      })
      .catch((err) => {
        upsertLocal(current);
        reportSyncError('Could not save listing changes', err);
      });
  };

  const deleteProperty = (id: string) => {
    const current = propertiesRef.current.find((p) => p.id === id);
    setProperties((prev) => prev.filter((p) => p.id !== id));
    ApiClient.properties.remove(id).catch((err) => {
      if (current) upsertLocal(current);
      reportSyncError('Could not delete the listing', err);
    });
  };

  const duplicateProperty = (id: string): string => {
    const orig = propertiesRef.current.find((p) => p.id === id);
    if (!orig) return '';
    const newId = uid('prop');
    const duplicated: OwnerPropertyListing = {
      ...orig,
      id: newId,
      slug: `${orig.slug}-copy-${Math.floor(100 + Math.random() * 900)}`,
      name: `${orig.name} (Copy)`,
      status: 'draft',
      isNestinVerified: false,
      isFeatured: false,
      rooms: orig.rooms.map((r) => ({
        ...r,
        id: uid('room'),
        beds: r.beds.map((b) => ({ ...b, id: uid('bed'), isOccupied: false, occupantName: undefined })),
        occupiedBedsCount: 0,
        availableBedsCount: r.beds.length,
      })),
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
    ApiClient.properties
      .create(duplicated as unknown as Record<string, unknown>)
      .then(upsertLocal)
      .catch((err) => {
        setProperties((prev) => prev.filter((p) => p.id !== newId));
        reportSyncError('Could not duplicate the listing', err);
      });
    return newId;
  };

  const archiveProperty = (id: string) => updateProperty(id, { status: 'archived' });

  const submitForVerification = (id: string): { success: boolean; message: string; missingFields?: string[] } => {
    const prop = propertiesRef.current.find((p) => p.id === id);
    if (!prop) return { success: false, message: 'Property not found' };
    const { score, missing } = calculatePropertyCompleteness(prop);
    if (score < 70) {
      return {
        success: false,
        message: `Listing is only ${score}% complete. Please provide required fields before submitting for review.`,
        missingFields: missing,
      };
    }
    upsertLocal({ ...prop, status: 'pending_approval', rejectionReason: undefined });
    ApiClient.properties
      .submit(id)
      .then((res) => upsertLocal(res.property))
      .catch((err) => {
        upsertLocal(prop);
        reportSyncError('Could not submit the listing for verification', err);
      });
    return { success: true, message: 'Property successfully submitted for verification & review!' };
  };

  const adminApproveProperty = (
    id: string,
    options?: { isNestinVerified?: boolean; isFeatured?: boolean; isZeroBrokerage?: boolean }
  ) => {
    const prop = propertiesRef.current.find((p) => p.id === id);
    if (prop)
      upsertLocal({
        ...prop,
        status: 'published',
        isNestinVerified: options?.isNestinVerified ?? true,
        isFeatured: options?.isFeatured ?? prop.isFeatured,
        rejectionReason: undefined,
      });
    ApiClient.admin
      .approveProperty(id, options)
      .then(upsertLocal)
      .catch((err) => {
        if (prop) upsertLocal(prop);
        reportSyncError('Could not approve the listing', err);
      });
  };

  const adminRejectProperty = (id: string, reason: string) => {
    const prop = propertiesRef.current.find((p) => p.id === id);
    if (prop) upsertLocal({ ...prop, status: 'rejected', rejectionReason: reason });
    ApiClient.admin
      .rejectProperty(id, reason)
      .then(upsertLocal)
      .catch((err) => {
        if (prop) upsertLocal(prop);
        reportSyncError('Could not reject the listing', err);
      });
  };

  const updateBedStatus = (
    propertyId: string,
    roomId: string,
    bedId: string,
    isOccupied: boolean,
    occupantName?: string
  ) => {
    const prop = propertiesRef.current.find((p) => p.id === propertyId);
    if (!prop) return;
    const rooms = prop.rooms.map((room) => {
      if (room.id !== roomId) return room;
      const beds = room.beds.map((bed) =>
        bed.id === bedId ? { ...bed, isOccupied, occupantName: isOccupied ? occupantName || 'Tenant' : undefined } : bed
      );
      const occ = beds.filter((b) => b.isOccupied).length;
      return { ...room, beds, occupiedBedsCount: occ, availableBedsCount: beds.length - occ };
    });
    upsertLocal({ ...prop, rooms });
    ApiClient.properties
      .setBed(propertyId, { roomId, bedId, isOccupied, occupantName })
      .then(upsertLocal)
      .catch((err) => {
        upsertLocal(prop);
        reportSyncError('Could not update bed status', err);
      });
  };

  const addTenantReview = (propertyId: string, review: Omit<PropertyResidentReview, 'id' | 'date'>) => {
    ApiClient.properties
      .addReview(propertyId, { rating: review.rating, comment: review.comment, residentRoom: review.residentRoom })
      .then(upsertLocal)
      .catch((err) => reportSyncError('Could not publish your review', err));
  };

  const bookRoom = async (
    propertyId: string,
    roomId: string,
    tenantName: string,
    options: { bedId?: string; moveInDate?: string; phone?: string; durationMonths?: number } = {}
  ) => {
    try {
      const res = await ApiClient.tenant.createBooking({
        propertyId,
        roomId: roomId || undefined,
        bedId: options.bedId,
        tenantName,
        tenantPhone: options.phone,
        moveInDate: options.moveInDate || new Date().toISOString().slice(0, 10),
        durationMonths: options.durationMonths,
      });
      return { success: true, bookingNumber: res.booking.bookingNumber as string, bookingId: res.booking.id as string };
    } catch (err) {
      return { success: false, bookingNumber: '', error: err instanceof Error ? err.message : 'Booking failed' };
    }
  };

  const toFindPGListing = useCallback((prop: OwnerPropertyListing): PropertyListing => {
    const minRent =
      prop.rooms && prop.rooms.length > 0
        ? Math.min(...prop.rooms.map((r) => r.monthlyRent))
        : prop.pricing?.minRent || 15000;
    const availableBeds = prop.rooms.reduce((acc, r) => acc + r.availableBedsCount, 0);
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
      rating: prop.systemMetrics.averageRating || 0,
      reviewsCount: prop.systemMetrics.totalReviews || 0,
      reviews: prop.systemMetrics.totalReviews || 0,
      verified: prop.isNestinVerified,
      featured: prop.isFeatured,
      gender: prop.category === 'Men' ? 'Boys' : prop.category === 'Women' ? 'Girls' : 'Co-living',
      sharing: prop.rooms.map((r) => r.type.replace(' Sharing', '')),
      food: prop.pricing.foodMess.type === 'Included',
      amenities: prop.amenities.filter((a) => a.isAvailable).map((a) => a.name),
      available: availableBeds > 0 ? `${availableBeds} beds available` : 'Waitlist only',
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
  }, []);

  return (
    <PropertyListingContext.Provider
      value={{
        properties,
        publishedProperties,
        ownerProperties,
        isLoading,
        refresh,
        getPropertyById,
        getPropertyBySlug,
        fetchPropertyBySlug,
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
