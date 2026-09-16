import React, { useState } from 'react';
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Save,
  Eye,
  Send,
  Building2,
  Image,
  Layers,
  BedDouble,
  IndianRupee,
  Sparkles,
  FileCheck,
  MapPin,
  Compass,
  UserCheck,
  FolderLock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Upload,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Award
} from 'lucide-react';
import {
  OwnerPropertyListing,
  PropertyType,
  PropertyCategory,
  PropertyRoom,
  PropertyMediaItem,
  PropertyNearbyPlace,
  PropertyAmenityItem,
  PropertyDocument,
} from '../../../types/property';
import { usePropertyListing, calculatePropertyCompleteness } from '../../../context/PropertyListingContext';
import { useAuth } from '../../../context/AuthContext';
import { PropertyDetailsView } from '../../property-details/PropertyDetailsView';

interface PropertyListingWizardProps {
  initialPropertyId?: string | null;
  initialData?: OwnerPropertyListing;
  onClose: () => void;
  onSuccess?: (propertyId: string, status: string) => void;
  onSaveDraft?: (property: OwnerPropertyListing) => void;
  onSubmitVerification?: (property: OwnerPropertyListing) => void;
}

const WIZARD_STEPS = [
  { step: 1, title: 'Basic Information', icon: Building2, desc: 'Name, type & category' },
  { step: 2, title: 'Photos & Media', icon: Image, desc: 'Cover, gallery, 360 & video' },
  { step: 3, title: 'Property Details', icon: Layers, desc: 'Floors, parking & utilities' },
  { step: 4, title: 'Rooms & Beds', icon: BedDouble, desc: 'Sharing types & bed allocation' },
  { step: 5, title: 'Pricing & Deposits', icon: IndianRupee, desc: 'Rent rates & utility fees' },
  { step: 6, title: 'Amenities & Facilities', icon: Sparkles, desc: 'Wi-Fi, AC, housekeeping' },
  { step: 7, title: 'House Rules & Policies', icon: FileCheck, desc: 'Curfew & cancellation' },
  { step: 8, title: 'Location & Map', icon: MapPin, desc: 'Address & coordinates' },
  { step: 9, title: 'Nearby Hubs', icon: Compass, desc: 'Metro, colleges & tech parks' },
  { step: 10, title: 'Owner / Caretaker', icon: UserCheck, desc: 'Contact & verified host' },
  { step: 11, title: 'Documents & KYC', icon: FolderLock, desc: 'Property title & trade license' },
  { step: 12, title: 'Preview & Publish', icon: Eye, desc: 'Live tenant preview & submit' },
];

export const PropertyListingWizard: React.FC<PropertyListingWizardProps> = ({
  initialPropertyId,
  initialData,
  onClose,
  onSuccess,
  onSaveDraft,
  onSubmitVerification,
}) => {
  const { properties, createProperty, updateProperty, submitForVerification, calculateInitialMoveIn } =
    usePropertyListing();
  const { user: wizardUser } = useAuth();

  const existingProp = initialData
    ? initialData
    : initialPropertyId
    ? properties.find((p) => p.id === initialPropertyId) || null
    : null;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(false);
  const [wizardNotice, setWizardNotice] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<OwnerPropertyListing>(() => {
    if (initialData) return initialData;
    if (existingProp) return existingProp;

    return {
      id: `prop-${Date.now()}`,
      ownerId: wizardUser?.ownerId || wizardUser?.id || 'owner',
      ownerName: wizardUser?.name || 'Owner',
      ownerEmail: wizardUser?.email || '',
      slug: '',
      name: '',
      type: 'Co-living',
      category: 'Co-ed',
      status: 'draft',
      completenessScore: 0,
      yearEstablished: 2024,
      floors: 4,
      contactNumber: '+91 98765 43210',
      propertyEmail: 'host@nestin.io',
      website: '',
      shortDescription: '',
      longDescription: '',
      tags: ['Co-living PG', 'Working Professionals', 'Student Friendly'],
      isNestinVerified: false,
      isFeatured: false,
      isZeroBrokerage: true,
      coverImage:
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1400&q=85',
      gallery: [
        {
          id: 'g-1',
          url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1400&q=85',
          title: 'Main Living Room & Dining Area',
          category: 'Living Area',
          isCover: true,
        },
        {
          id: 'g-2',
          url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85',
          title: 'Private AC Bedroom with Workstation',
          category: 'Bedrooms',
        },
        {
          id: 'g-3',
          url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=85',
          title: 'Study Room & Quiet Lounge',
          category: 'Study Area',
        },
      ],
      videoTourUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      virtualTour360Url: 'https://momento360.com/e/u/nestin-demo-tour',
      details: {
        totalRooms: 12,
        totalBeds: 24,
        totalFloors: 4,
        capacity: 24,
        parkingAvailable: true,
        parkingType: 'Both',
        powerBackup: '24/7 Generator',
        waterSupply: '24/7 RO Purified',
        securityType: '3-Tier Biometric & CCTV',
        cctv: true,
        biometricAccess: true,
        housekeeping: 'Daily Housekeeping',
        laundry: 'Washing Machines Available',
      },
      rooms: [
        {
          id: 'r-1',
          name: 'Double Sharing Standard',
          type: 'Double Sharing',
          sharingTypeSlug: 'double-sharing',
          floor: 2,
          sizeSqFt: 240,
          capacity: 2,
          availableBedsCount: 2,
          occupiedBedsCount: 0,
          bathroomType: 'Attached Bathroom',
          hasAC: true,
          furnishing: 'Fully Furnished',
          monthlyRent: 16500,
          securityDeposit: 33000,
          bookingFee: 999,
          maintenance: 800,
          beds: [
            { id: 'b-1', bedNumber: 'Bed 201-A', isOccupied: false },
            { id: 'b-2', bedNumber: 'Bed 201-B', isOccupied: false },
          ],
        },
        {
          id: 'r-2',
          name: 'Single Private Suite',
          type: 'Single Sharing',
          sharingTypeSlug: 'single-sharing',
          floor: 3,
          sizeSqFt: 180,
          capacity: 1,
          availableBedsCount: 1,
          occupiedBedsCount: 0,
          bathroomType: 'Attached Bathroom',
          hasAC: true,
          furnishing: 'Fully Furnished',
          monthlyRent: 24750,
          securityDeposit: 49500,
          bookingFee: 999,
          maintenance: 800,
          beds: [{ id: 'b-3', bedNumber: 'Bed 301', isOccupied: false }],
        },
      ],
      pricing: {
        minRent: 16500,
        securityDepositRefundPolicy: '100% Refundable upon 30 days notice',
        electricity: { type: 'Metered', amount: 1200, label: '₹1200/mo approx' },
        water: { type: 'Included', amount: 200, label: 'Included (₹200)' },
        foodMess: { type: 'Included', mealsPerDay: 4, label: 'Included (4 Meals/day)' },
        laundryAndHousekeeping: { type: 'Included', label: 'Included' },
        maintenance: { type: 'Included', amount: 800, label: '₹800/month included' },
        bookingFee: 999,
      },
      amenities: [
        { id: 'a-1', name: 'High-Speed Wi-Fi', category: 'Connectivity', iconKey: 'wifi', subtext: '300 Mbps Dual Band', isAvailable: true },
        { id: 'a-2', name: 'Air Conditioning', category: 'Comfort', iconKey: 'ac', subtext: 'In all bedrooms', isAvailable: true },
        { id: 'a-3', name: 'Housekeeping', category: 'Housekeeping', iconKey: 'housekeeping', subtext: 'Daily room cleaning', isAvailable: true },
        { id: 'a-4', name: 'Laundry', category: 'Housekeeping', iconKey: 'laundry', subtext: 'Washing machines', isAvailable: true },
        { id: 'a-5', name: 'Power Backup', category: 'Utilities', iconKey: 'power', subtext: '24/7 Generator', isAvailable: true },
        { id: 'a-6', name: 'CCTV Security', category: 'Security', iconKey: 'cctv', subtext: '3-tier biometric', isAvailable: true },
        { id: 'a-7', name: 'RO Water', category: 'Utilities', iconKey: 'water', subtext: 'Purified drinking water', isAvailable: true },
        { id: 'a-8', name: 'Study & Work Hub', category: 'Lifestyle', iconKey: 'study', subtext: 'Quiet co-working', isAvailable: true },
      ],
      policies: {
        curfew: 'Main entrance gate locks at 11:00 PM. Late entry permitted with registered guardian/owner approval.',
        visitorPolicy: 'Visitors allowed in ground floor common lounge between 9:00 AM – 8:00 PM with ID log.',
        smokingAndAlcohol: 'Strictly zero smoking inside bedrooms, corridors, or dining halls. Designated rooftop zone provided.',
        cancellationPolicy: '30 days prior written notice required before vacating. Security deposit refunded in 15 working days.',
        noticePeriod: '30 Days Mandatory Notice',
        petPolicy: 'No pets allowed.',
        guestPolicy: 'Lounge access only.',
        ageRestrictions: '18 - 35 Years',
        genderPolicy: 'Co-ed Living',
        additionalRules: ['Quiet hours in study room after 10 PM.'],
      },
      location: {
        addressLine1: '18, Whitefield Main Road, Kukatpally',
        area: 'Kukatpally',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500072',
        latitude: 17.4849,
        longitude: 78.4138,
        formattedAddress: '18, Whitefield Main Road, Kukatpally, Kukatpally, Hyderabad, Telangana - 500072',
        distanceLabel: '8.3 km away',
        moveInAvailabilityLabel: 'Available now',
      },
      nearbyPlaces: [
        { id: 'np-1', category: 'Metro', name: 'Kukatpally Metro Station', distanceKm: 0.4, travelTime: '5 mins walk', travelMode: 'walk' },
        { id: 'np-2', category: 'Bus Stop', name: 'Kukatpally Main Junction Stop', distanceKm: 0.2, travelTime: '2 mins walk', travelMode: 'walk' },
        { id: 'np-3', category: 'Company', name: 'Tech Park & IT Cyber Hub', distanceKm: 1.1, travelTime: '4 mins ride', travelMode: 'ride' },
      ],
      caretaker: {
        name: 'Ramesh Reddy',
        phone: '+91 98765 43210',
        email: 'ramesh@banyanstay.com',
        isIdentityVerified: false,
        isBackgroundVerified: false,
        isPubliclyVisible: true,
      },
      documents: [
        {
          id: 'doc-1',
          title: 'Property Ownership Proof / Title Deed',
          type: 'ownership_proof',
          fileUrl: '/sample-deed.pdf',
          fileName: 'property_deed_2026.pdf',
          fileSize: '2.1 MB',
          uploadedAt: '2026-08-19',
          status: 'pending',
        },
      ],
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
  });

  const notify = (msg: string) => {
    setWizardNotice(msg);
    setTimeout(() => setWizardNotice(null), 3000);
  };

  const { score: completenessScore, missing: missingFields } =
    calculatePropertyCompleteness(formData);

  // Save Draft Handler
  const handleSaveDraft = () => {
    const updatedDraft = { ...formData, status: 'draft' as const };
    if (onSaveDraft) {
      onSaveDraft(updatedDraft);
      notify('Draft changes saved successfully!');
    } else if (existingProp) {
      updateProperty(existingProp.id, updatedDraft);
      notify('Draft changes saved successfully!');
    } else {
      const newId = createProperty(updatedDraft);
      notify('New property saved as draft!');
      if (onSuccess) onSuccess(newId, 'draft');
    }
  };

  // Submit for Verification Handler
  const handleSubmitVerification = () => {
    if (onSubmitVerification) {
      onSubmitVerification(formData);
      return;
    }

    let propId = existingProp ? existingProp.id : '';
    if (!propId) {
      propId = createProperty({ ...formData, status: 'draft' });
    } else {
      updateProperty(propId, formData);
    }

    const res = submitForVerification(propId);
    if (!res.success) {
      notify(res.message);
      return;
    }

    notify('Property submitted for verification & review!');
    if (onSuccess) onSuccess(propId, 'pending_approval');
  };

  // Quick Step Navigation
  const goToNextStep = () => {
    if (currentStep < 12) setCurrentStep((prev) => prev + 1);
  };
  const goToPrevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  // -------------------------------------------------------------
  // RENDER DEDICATED STEP CONTENT
  // -------------------------------------------------------------

  const renderStepBody = () => {
    switch (currentStep) {
      // -------------------------------------------------------------
      // STEP 1 — BASIC INFORMATION
      // -------------------------------------------------------------
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Step 1 — Basic Property Information
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your property title, operational category, and primary contact details.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Property Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Banyan Stay Premium"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Property Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PropertyType })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="Co-living">Co-living</option>
                  <option value="PG">PG (Paying Guest)</option>
                  <option value="Hostel">Hostel</option>
                  <option value="Student Housing">Student Housing</option>
                  <option value="Working Professionals">Working Professionals</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Property Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as PropertyCategory })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="Co-ed">Co-ed Living</option>
                  <option value="Men">Men's Only</option>
                  <option value="Women">Women's Only</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Short Description (Card Summary) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Premium co-living with 300 Mbps Wi-Fi and chef meals in Kukatpally."
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Long Description (About Property) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide comprehensive details about security, cleanliness, food mess, and proximity to tech hubs..."
                  value={formData.longDescription}
                  onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Property Email</label>
                <input
                  type="email"
                  value={formData.propertyEmail}
                  onChange={(e) => setFormData({ ...formData, propertyEmail: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Total Floors</label>
                <input
                  type="number"
                  min={1}
                  value={formData.floors}
                  onChange={(e) => setFormData({ ...formData, floors: Number(e.target.value) })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Year Established</label>
                <input
                  type="number"
                  value={formData.yearEstablished}
                  onChange={(e) => setFormData({ ...formData, yearEstablished: Number(e.target.value) })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            {/* Note on Verification Trust Badges */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black font-heading">Verification Notice:</strong>
                Trust badges like <span className="font-bold">"Nestin Verified Stay"</span> and{' '}
                <span className="font-bold">"Featured Property"</span> are verified & awarded by
                our verification team upon inspection of your uploaded documents and property audit.
              </div>
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 2 — PHOTOS & MEDIA
      // -------------------------------------------------------------
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Step 2 — Photos & Media Upload
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                High-quality photos significantly increase tenant booking inquiries. Add your cover and room views.
              </p>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Hero Cover Image <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <img
                  src={formData.coverImage}
                  alt="Cover Preview"
                  className="w-full sm:w-48 h-32 rounded-2xl object-cover border border-slate-200 shadow-xs"
                />
                <div className="flex-1 space-y-2 w-full">
                  <input
                    type="text"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    placeholder="Enter image URL or select from uploads"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          coverImage:
                            'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1400&q=85',
                        })
                      }
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
                    >
                      Sample Luxury Lounge
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          coverImage:
                            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85',
                        })
                      }
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
                    >
                      Sample Bedroom Suite
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery Photos */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Property Gallery Photos ({formData.gallery.length})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newPhoto: PropertyMediaItem = {
                      id: `g-${Date.now()}`,
                      url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85',
                      title: 'Double Occupancy Bedroom View',
                      category: 'Bedrooms',
                    };
                    setFormData({ ...formData, gallery: [...formData.gallery, newPhoto] });
                    notify('Photo added to gallery!');
                  }}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Photo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {formData.gallery.map((photo, idx) => (
                  <div
                    key={photo.id || idx}
                    className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2 relative group"
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-28 object-cover rounded-xl border border-slate-100"
                    />
                    <input
                      type="text"
                      value={photo.title}
                      onChange={(e) => {
                        const updated = [...formData.gallery];
                        updated[idx].title = e.target.value;
                        setFormData({ ...formData, gallery: updated });
                      }}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                    <div className="flex items-center justify-between">
                      <select
                        value={photo.category}
                        onChange={(e) => {
                          const updated = [...formData.gallery];
                          updated[idx].category = e.target.value as any;
                          setFormData({ ...formData, gallery: updated });
                        }}
                        className="p-1 border border-slate-200 rounded text-[11px]"
                      >
                        <option value="Exterior">Exterior</option>
                        <option value="Living Area">Living Area</option>
                        <option value="Bedrooms">Bedrooms</option>
                        <option value="Study Area">Study Area</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Dining">Dining</option>
                        <option value="Common Areas">Common Areas</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.gallery.filter((_, i) => i !== idx);
                          setFormData({ ...formData, gallery: updated });
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Tour & 360 Tour URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Video Tour URL (YouTube/Vimeo)
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={formData.videoTourUrl || ''}
                  onChange={(e) => setFormData({ ...formData, videoTourUrl: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  360° Virtual Tour Link (Momento360/Matterport)
                </label>
                <input
                  type="url"
                  placeholder="https://momento360.com/e/u/..."
                  value={formData.virtualTour360Url || ''}
                  onChange={(e) => setFormData({ ...formData, virtualTour360Url: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 3 — PROPERTY DETAILS & UTILITIES
      // -------------------------------------------------------------
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Step 3 — Property Details & Utilities
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define the overall capacity, security infrastructure, and maintenance protocols.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Total Rooms</label>
                <input
                  type="number"
                  min={1}
                  value={formData.details.totalRooms}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, totalRooms: Number(e.target.value) },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Total Bed Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={formData.details.totalBeds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      details: {
                        ...formData.details,
                        totalBeds: Number(e.target.value),
                        capacity: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Parking Available</label>
                <select
                  value={formData.details.parkingType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, parkingType: e.target.value as any },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="Both">Both (2-Wheeler & 4-Wheeler)</option>
                  <option value="2-Wheeler">2-Wheeler Only</option>
                  <option value="4-Wheeler">4-Wheeler Only</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Power Backup</label>
                <input
                  type="text"
                  value={formData.details.powerBackup}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, powerBackup: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Water Supply</label>
                <input
                  type="text"
                  value={formData.details.waterSupply}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, waterSupply: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Housekeeping Cadence</label>
                <input
                  type="text"
                  value={formData.details.housekeeping}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      details: { ...formData.details, housekeeping: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 4 — ROOMS & BEDS
      // -------------------------------------------------------------
      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Step 4 — Rooms & Individual Bed Allocation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add rooms and track each individual bed's occupancy. Automatically updates Find PG availability.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newRoom: PropertyRoom = {
                    id: `r-${Date.now()}`,
                    name: 'Triple Sharing Executive',
                    type: 'Triple Sharing',
                    sharingTypeSlug: 'triple-sharing',
                    floor: 1,
                    sizeSqFt: 320,
                    capacity: 3,
                    availableBedsCount: 3,
                    occupiedBedsCount: 0,
                    bathroomType: 'Attached Bathroom',
                    hasAC: true,
                    furnishing: 'Fully Furnished',
                    monthlyRent: 13530,
                    securityDeposit: 27060,
                    bookingFee: 999,
                    maintenance: 800,
                    beds: [
                      { id: `b-${Date.now()}-1`, bedNumber: 'Bed 101-A', isOccupied: false },
                      { id: `b-${Date.now()}-2`, bedNumber: 'Bed 101-B', isOccupied: false },
                      { id: `b-${Date.now()}-3`, bedNumber: 'Bed 101-C', isOccupied: false },
                    ],
                  };
                  setFormData({ ...formData, rooms: [...formData.rooms, newRoom] });
                  notify('Room configuration added!');
                }}
                className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Room</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.rooms.map((room, rIdx) => (
                <div
                  key={room.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 text-[#a3e635] font-black text-xs flex items-center justify-center font-heading">
                        {rIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => {
                          const updated = [...formData.rooms];
                          updated[rIdx].name = e.target.value;
                          setFormData({ ...formData, rooms: updated });
                        }}
                        className="font-black text-slate-900 text-sm font-heading border-b border-transparent focus:border-slate-900"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={room.type}
                        onChange={(e) => {
                          const updated = [...formData.rooms];
                          updated[rIdx].type = e.target.value as any;
                          setFormData({ ...formData, rooms: updated });
                        }}
                        className="p-1.5 bg-slate-100 rounded-lg text-xs font-bold"
                      >
                        <option value="Single Sharing">Single Sharing</option>
                        <option value="Double Sharing">Double Sharing</option>
                        <option value="Triple Sharing">Triple Sharing</option>
                        <option value="Four Sharing">Four Sharing</option>
                        <option value="Dormitory">Dormitory</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.rooms.filter((_, i) => i !== rIdx);
                          setFormData({ ...formData, rooms: updated });
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Monthly Rent (₹)</label>
                      <input
                        type="number"
                        value={room.monthlyRent}
                        onChange={(e) => {
                          const updated = [...formData.rooms];
                          updated[rIdx].monthlyRent = Number(e.target.value);
                          setFormData({ ...formData, rooms: updated });
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Deposit (₹)</label>
                      <input
                        type="number"
                        value={room.securityDeposit}
                        onChange={(e) => {
                          const updated = [...formData.rooms];
                          updated[rIdx].securityDeposit = Number(e.target.value);
                          setFormData({ ...formData, rooms: updated });
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Bathroom</label>
                      <select
                        value={room.bathroomType}
                        onChange={(e) => {
                          const updated = [...formData.rooms];
                          updated[rIdx].bathroomType = e.target.value as any;
                          setFormData({ ...formData, rooms: updated });
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      >
                        <option value="Attached Bathroom">Attached Bathroom</option>
                        <option value="Common Washroom">Common Washroom</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Air Conditioning</label>
                      <select
                        value={room.hasAC ? 'yes' : 'no'}
                        onChange={(e) => {
                          const updated = [...formData.rooms];
                          updated[rIdx].hasAC = e.target.value === 'yes';
                          setFormData({ ...formData, rooms: updated });
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      >
                        <option value="yes">Air Conditioned (AC)</option>
                        <option value="no">Non-AC</option>
                      </select>
                    </div>
                  </div>

                  {/* Individual Beds inside this Room */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-extrabold uppercase text-slate-400">
                      Beds Allocation (Click to toggle occupied/available)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {room.beds.map((bed, bIdx) => (
                        <button
                          key={bed.id || bIdx}
                          type="button"
                          onClick={() => {
                            const updated = [...formData.rooms];
                            const currentOcc = updated[rIdx].beds[bIdx].isOccupied;
                            updated[rIdx].beds[bIdx].isOccupied = !currentOcc;
                            updated[rIdx].occupiedBedsCount = updated[rIdx].beds.filter(
                              (b) => b.isOccupied
                            ).length;
                            updated[rIdx].availableBedsCount =
                              updated[rIdx].beds.length - updated[rIdx].occupiedBedsCount;
                            setFormData({ ...formData, rooms: updated });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            bed.isOccupied
                              ? 'bg-slate-900 text-white'
                              : 'bg-[#ecfccb] text-[#3f6212] border border-[#a3e635]'
                          }`}
                        >
                          <span>{bed.bedNumber}</span>
                          <span>•</span>
                          <span>{bed.isOccupied ? 'Occupied' : 'Available'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 5 — PRICING & MOVE-IN CHARGES
      // -------------------------------------------------------------
      case 5:
        const moveInExample = calculateInitialMoveIn(formData);
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Step 5 — Pricing & Transparent Move-in Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The platform automatically calculates the total initial move-in amount for prospective residents.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Starting Rent (₹/mo) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.pricing.minRent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing: { ...formData.pricing, minRent: Number(e.target.value) },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Booking Token Fee (₹)
                </label>
                <input
                  type="number"
                  value={formData.pricing.bookingFee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing: { ...formData.pricing, bookingFee: Number(e.target.value) },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Maintenance Fee (₹/mo)
                </label>
                <input
                  type="number"
                  value={formData.pricing.maintenance.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing: {
                        ...formData.pricing,
                        maintenance: {
                          ...formData.pricing.maintenance,
                          amount: Number(e.target.value),
                          label: `₹${e.target.value}/month included`,
                        },
                      },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            {/* Live Calculated Move-in Amount */}
            <div className="p-5 rounded-2xl bg-[#0f2e1e] text-white space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-[#a3e635]">
                Dynamic Initial Move-in Amount (Calculated Automatically)
              </div>
              <div className="text-3xl font-black font-heading">
                ₹{moveInExample.totalInitialAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-300">
                Formula: Monthly Rent (₹{moveInExample.monthlyRent.toLocaleString('en-IN')}) + Security Deposit (₹
                {moveInExample.securityDeposit.toLocaleString('en-IN')}) + Token Fee (₹{moveInExample.bookingFee})
              </div>
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 6 — AMENITIES & FACILITIES
      // -------------------------------------------------------------
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Step 6 — Amenities & Facilities
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Check all available amenities. These render directly on the tenant property profile with verified icons.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {formData.amenities.map((amenity, idx) => (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => {
                    const updated = [...formData.amenities];
                    updated[idx].isAvailable = !updated[idx].isAvailable;
                    setFormData({ ...formData, amenities: updated });
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                    amenity.isAvailable
                      ? 'bg-[#ecfccb]/60 border-[#84cc16] shadow-xs'
                      : 'bg-white border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 font-heading">
                      {amenity.name}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                        amenity.isAvailable ? 'bg-slate-900 text-[#a3e635]' : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      ✓
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">{amenity.subtext}</div>
                </button>
              ))}
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 7 — HOUSE RULES & POLICIES
      // -------------------------------------------------------------
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Step 7 — House Rules & Policies
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set clear community guidelines to ensure compatible resident onboarding.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Curfew Timings</label>
                <input
                  type="text"
                  value={formData.policies.curfew}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      policies: { ...formData.policies, curfew: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Visitor Policy</label>
                <input
                  type="text"
                  value={formData.policies.visitorPolicy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      policies: { ...formData.policies, visitorPolicy: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Smoking & Alcohol Policy</label>
                <input
                  type="text"
                  value={formData.policies.smokingAndAlcohol}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      policies: { ...formData.policies, smokingAndAlcohol: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Cancellation & Notice Period</label>
                <input
                  type="text"
                  value={formData.policies.cancellationPolicy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      policies: { ...formData.policies, cancellationPolicy: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 8 — LOCATION & MAP
      // -------------------------------------------------------------
      case 8:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Step 8 — Location & Map Coordinates
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Accurate pin placement ensures prospective tenants find your accommodation easily on Find PG.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Address Line 1 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location.addressLine1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: {
                        ...formData.location,
                        addressLine1: e.target.value,
                        formattedAddress: `${e.target.value}, ${formData.location.area}, ${formData.location.city} - ${formData.location.pincode}`,
                      },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">City <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.location.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: { ...formData.location, city: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Locality / Area</label>
                <input
                  type="text"
                  value={formData.location.area}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: { ...formData.location, area: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">PIN Code</label>
                <input
                  type="text"
                  value={formData.location.pincode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: { ...formData.location, pincode: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Latitude & Longitude</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    value={formData.location.latitude}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: { ...formData.location, latitude: Number(e.target.value) },
                      })
                    }
                    className="w-1/2 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.location.longitude}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: { ...formData.location, longitude: Number(e.target.value) },
                      })
                    }
                    className="w-1/2 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 9 — NEARBY HUBS
      // -------------------------------------------------------------
      case 9:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Step 9 — Nearby Hubs & Transit Distances
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Highlight metro stations, bus stops, colleges, and IT hubs near your property.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newPlace: PropertyNearbyPlace = {
                    id: `np-${Date.now()}`,
                    category: 'Metro',
                    name: 'Kukatpally Metro Station',
                    distanceKm: 0.5,
                    travelTime: '5 mins walk',
                    travelMode: 'walk',
                  };
                  setFormData({
                    ...formData,
                    nearbyPlaces: [...formData.nearbyPlaces, newPlace],
                  });
                  notify('Nearby landmark added!');
                }}
                className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Landmark</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formData.nearbyPlaces.map((place, idx) => (
                <div
                  key={place.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <select
                      value={place.category}
                      onChange={(e) => {
                        const updated = [...formData.nearbyPlaces];
                        updated[idx].category = e.target.value as any;
                        setFormData({ ...formData, nearbyPlaces: updated });
                      }}
                      className="p-1 bg-[#ecfccb] text-[#3f6212] font-black text-[10px] rounded uppercase"
                    >
                      <option value="Metro">Metro</option>
                      <option value="Bus Stop">Bus Stop</option>
                      <option value="College">College</option>
                      <option value="University">University</option>
                      <option value="Company">Company</option>
                      <option value="Hospital">Hospital</option>
                      <option value="Mall">Mall</option>
                      <option value="ATM">ATM</option>
                      <option value="Restaurant">Restaurant</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.nearbyPlaces.filter((_, i) => i !== idx);
                        setFormData({ ...formData, nearbyPlaces: updated });
                      }}
                      className="text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={place.name}
                    onChange={(e) => {
                      const updated = [...formData.nearbyPlaces];
                      updated[idx].name = e.target.value;
                      setFormData({ ...formData, nearbyPlaces: updated });
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />

                  <div className="flex gap-2 text-xs">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Distance (km)"
                      value={place.distanceKm}
                      onChange={(e) => {
                        const updated = [...formData.nearbyPlaces];
                        updated[idx].distanceKm = Number(e.target.value);
                        setFormData({ ...formData, nearbyPlaces: updated });
                      }}
                      className="w-1/2 p-2 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="e.g. 5 mins walk"
                      value={place.travelTime}
                      onChange={(e) => {
                        const updated = [...formData.nearbyPlaces];
                        updated[idx].travelTime = e.target.value;
                        setFormData({ ...formData, nearbyPlaces: updated });
                      }}
                      className="w-1/2 p-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 10 — OWNER / CARETAKER
      // -------------------------------------------------------------
      case 10:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Step 10 — Caretaker & Host Information
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The resident sees this contact person on the verified property profile card.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Caretaker / Host Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.caretaker.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      caretaker: { ...formData.caretaker, name: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Caretaker Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.caretaker.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      caretaker: { ...formData.caretaker, phone: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Host Email</label>
                <input
                  type="email"
                  value={formData.caretaker.email || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      caretaker: { ...formData.caretaker, email: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Emergency Contact</label>
                <input
                  type="tel"
                  value={formData.caretaker.emergencyContact || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      caretaker: { ...formData.caretaker, emergencyContact: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 11 — DOCUMENTS & KYC
      // -------------------------------------------------------------
      case 11:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Step 11 — Documents & Property Verification
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload verification credentials required for listing approval & the "Nestin Verified Stay" badge.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { title: 'Property Ownership Title / Deed', type: 'ownership_proof' },
                { title: 'GHMC / Municipal Trade & PG License', type: 'pg_license' },
                { title: 'Fire Safety NOC Clearance Certificate', type: 'fire_safety' },
                { title: 'Owner Government Identity Proof (Aadhaar/PAN)', type: 'govt_id' },
              ].map((docItem, idx) => {
                const uploaded = formData.documents.find((d) => d.type === docItem.type);

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-black text-slate-900 font-heading">
                        {docItem.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {uploaded ? `${uploaded.fileName} (${uploaded.fileSize})` : 'Not uploaded yet'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {uploaded ? (
                        <span className="px-3 py-1 bg-[#f7fee7] text-[#3f6212] border border-[#d9f99d] rounded-full text-xs font-bold">
                          ✓ Uploaded (Ready for Review)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const newDoc: PropertyDocument = {
                              id: `doc-${Date.now()}`,
                              title: docItem.title,
                              type: docItem.type as any,
                              fileUrl: `/docs/${docItem.type}.pdf`,
                              fileName: `${docItem.type}_2026.pdf`,
                              fileSize: '1.8 MB',
                              uploadedAt: new Date().toISOString(),
                              status: 'pending',
                            };
                            setFormData({ ...formData, documents: [...formData.documents, newDoc] });
                            notify(`Uploaded ${docItem.title}`);
                          }}
                          className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-slate-800"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // STEP 12 — PREVIEW & SUBMISSION
      // -------------------------------------------------------------
      case 12:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Step 12 — Preview & Submit for Verification
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your complete property profile score before submitting for verification and publishing.
              </p>
            </div>

            {/* Profile Completeness Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Property Completeness
                  </span>
                  <div className="text-2xl font-black text-slate-950 font-heading">
                    {completenessScore}% Complete
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full border-4 border-[#a3e635] flex items-center justify-center font-black text-sm font-heading">
                  {completenessScore}%
                </div>
              </div>

              {missingFields.length > 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <strong>Recommended fields to complete before approval:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {missingFields.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-3 bg-[#f7fee7] rounded-xl border border-[#d9f99d] text-xs text-[#3f6212] font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#65a30d]" />
                  <span>All required property details, photos, and policies are completed!</span>
                </div>
              )}
            </div>

            {/* Preview Action Card */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase text-[#a3e635]">Live Tenant View</div>
                <h4 className="text-base font-black font-heading mt-0.5">
                  Inspect Property Details Exactly as Tenants See It
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rendered directly from your active listing data with zero hardcoded placeholders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLivePreview(true)}
                className="px-5 py-3 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Eye className="w-4 h-4" />
                <span>Open Live Preview</span>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-between overflow-hidden font-sans" data-lenis-prevent="true">
      {/* Toast Notice */}
      {wizardNotice && (
        <div className="fixed top-6 right-6 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
          <span>{wizardNotice}</span>
        </div>
      )}

      {/* FULLSCREEN LIVE TENANT PREVIEW MODAL */}
      {showLivePreview && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto" data-lenis-prevent="true">
          <PropertyDetailsView
            property={formData}
            isPreviewMode={true}
            onClosePreview={() => setShowLivePreview(false)}
          />
        </div>
      )}

      {/* MAIN WIZARD DIALOG CONTAINER */}
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto my-auto max-h-[92vh] bg-[#FAF9F5] rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden">
        {/* WIZARD HEADER BAR */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-[#a3e635] flex items-center justify-center font-heading font-black text-base shadow-xs">
              {currentStep}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 font-heading">
                  STEP {currentStep} OF 12
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="text-[10px] font-extrabold text-[#4d7c0f]">
                  {completenessScore}% Complete
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-950 font-heading">
                {WIZARD_STEPS[currentStep - 1].title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLivePreview(true)}
              className="hidden sm:flex px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STEP PROGRESS TRACKER STRIP */}
        <div className="bg-white px-6 py-2.5 border-b border-slate-200/80 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {WIZARD_STEPS.map((s) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            const Icon = s.icon;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStep(s.step)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : isCompleted
                    ? 'bg-[#ecfccb] text-[#3f6212]'
                    : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{s.step}. {s.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* STEP SCROLLABLE CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 overscroll-contain" data-lenis-prevent="true">
          {renderStepBody()}
        </div>

        {/* BOTTOM NAVIGATION CONTROLS */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={goToPrevStep}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              currentStep === 1
                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            {currentStep < 12 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitVerification}
                className="px-6 py-2.5 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit for Verification</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
