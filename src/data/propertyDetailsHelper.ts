import { PropertyListing } from '../types';
import { GENERATED_PROPERTIES_DATA } from './propertiesData';

export interface RoomOption {
  id: string;
  type: string;
  rent: number;
  availability: string;
  bedsCount: number;
  roomSize: string;
  attachedBathroom: boolean;
  balcony: boolean;
  airConditioning: boolean;
}

export interface NearbyPlaceItem {
  id: string;
  category: 'Metro' | 'Bus Stop' | 'College' | 'University' | 'Company' | 'Hospital' | 'Mall' | 'ATM' | 'Restaurant' | 'Medical Store';
  name: string;
  distance: string;
  travelTime: string;
}

export interface DetailedReview {
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

export interface FoodMenuItem {
  day: string;
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
}

export interface DetailedProperty extends PropertyListing {
  pincode: string;
  state: string;
  securityDeposit: number;
  advanceDeposit: number;
  bookingFee: number;
  maintenance: number;
  electricity: number;
  water: number;
  foodCharges: number;
  laundryCharges: number;
  gstAmount: number;
  totalMoveInCost: number;
  moveInDate: string;
  virtualTourUrl: string;
  videoTourUrl: string;
  sharingCards: RoomOption[];
  foodMenu: FoodMenuItem[];
  foodTimings: {
    breakfast: string;
    lunch: string;
    snacks: string;
    dinner: string;
  };
  messRules: string[];
  houseRulesList: {
    curfew: string;
    visitorPolicy: string;
    smokingPolicy: string;
    drinkingPolicy: string;
    refundPolicy: string;
    cancellationPolicy: string;
    general: string[];
  };
  nearbyPlacesList: NearbyPlaceItem[];
  galleryImages: { url: string; title: string; category: string }[];
  reviewsList: DetailedReview[];
}

const DEFAULT_GALLERY_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
    title: 'Modern Living Room & Dining Area',
    category: 'Common Area',
  },
  {
    url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    title: 'Private Bedroom Suite with Workdesk',
    category: 'Bedroom',
  },
  {
    url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    title: 'Co-Working & Study Lounge',
    category: 'Study Room',
  },
  {
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    title: 'Spacious Shared Double Occupancy Room',
    category: 'Bedroom',
  },
  {
    url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=80',
    title: 'Attached Bathroom with Hot Water Geyser',
    category: 'Bathroom',
  },
  {
    url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
    title: 'Hygienic Dining Mess & Cafe',
    category: 'Dining',
  },
  {
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
    title: 'Rooftop Chill & Workout Zone',
    category: 'Outdoors',
  }
];

export function getPropertyBySlug(slug: string): DetailedProperty | null {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase().trim();

  // Search through all properties
  let prop = GENERATED_PROPERTIES_DATA.find(
    (p) => p.slug && p.slug.toLowerCase() === cleanSlug
  );

  if (!prop) {
    prop = GENERATED_PROPERTIES_DATA.find((p) => {
      const titleSlug = (p.title || p.name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return titleSlug === cleanSlug;
    });
  }

  if (!prop) {
    prop = GENERATED_PROPERTIES_DATA.find((p) => {
      if (!p.slug) return false;
      return p.slug.toLowerCase().startsWith(cleanSlug) || cleanSlug.startsWith(p.slug.toLowerCase());
    });
  }

  if (!prop) {
    prop = GENERATED_PROPERTIES_DATA.find((p) => p.id.toLowerCase() === cleanSlug);
  }

  if (!prop) return null;

  const rent = prop.rent || prop.price || 14500;
  const securityDeposit = rent * 2;
  const advanceDeposit = rent;
  const bookingFee = 999;
  const maintenance = 800;
  const electricity = 1200;
  const water = 200;
  const foodCharges = prop.food ? 2500 : 0;
  const laundryCharges = 500;
  const gstAmount = Math.round(rent * 0.12);
  const totalMoveInCost = rent + securityDeposit + bookingFee;

  const cityStateMap: Record<string, { state: string; pincode: string }> = {
    Hyderabad: { state: 'Telangana', pincode: '500072' },
    Mumbai: { state: 'Maharashtra', pincode: '400050' },
    Bengaluru: { state: 'Karnataka', pincode: '560066' },
    Pune: { state: 'Maharashtra', pincode: '411045' },
    Chennai: { state: 'Tamil Nadu', pincode: '600096' },
    Delhi: { state: 'Delhi', pincode: '110001' },
    Gurugram: { state: 'Haryana', pincode: '122002' },
    Noida: { state: 'Uttar Pradesh', pincode: '201301' },
    Kolkata: { state: 'West Bengal', pincode: '700091' },
  };

  const cityInfo = cityStateMap[prop.city] || { state: 'Karnataka', pincode: '560038' };

  const sharingCards: RoomOption[] = [
    {
      id: 'sh-1',
      type: 'Single Sharing',
      rent: Math.round(rent * 1.5),
      availability: '1 room available',
      bedsCount: 1,
      roomSize: '180 sq ft',
      attachedBathroom: true,
      balcony: true,
      airConditioning: true,
    },
    {
      id: 'sh-2',
      type: 'Double Sharing',
      rent: rent,
      availability: 'Available now',
      bedsCount: 2,
      roomSize: '240 sq ft',
      attachedBathroom: true,
      balcony: true,
      airConditioning: true,
    },
    {
      id: 'sh-3',
      type: 'Triple Sharing',
      rent: Math.round(rent * 0.82),
      availability: '3 beds left',
      bedsCount: 3,
      roomSize: '320 sq ft',
      attachedBathroom: true,
      balcony: false,
      airConditioning: true,
    },
    {
      id: 'sh-4',
      type: 'Four Sharing',
      rent: Math.round(rent * 0.68),
      availability: 'Available now',
      bedsCount: 4,
      roomSize: '400 sq ft',
      attachedBathroom: true,
      balcony: false,
      airConditioning: false,
    },
    {
      id: 'sh-5',
      type: 'Dormitory',
      rent: Math.round(rent * 0.52),
      availability: '2 beds left',
      bedsCount: 6,
      roomSize: '550 sq ft',
      attachedBathroom: false,
      balcony: true,
      airConditioning: true,
    },
  ];

  const foodMenu: FoodMenuItem[] = [
    {
      day: 'Monday',
      breakfast: 'Idli, Sambar, Coconut Chutney, Masala Tea / Coffee',
      lunch: 'Phulka Roti, Jeera Rice, Dal Tadka, Paneer Butter Masala, Salad, Curd',
      snacks: 'Hot Samosa, Green Chutney, Special Adrak Chai',
      dinner: 'Butter Naan, Veg Pulao, Kadai Paneer, Gulab Jamun',
    },
    {
      day: 'Tuesday',
      breakfast: 'Puri Bhaji, Sprouted Moong, Filter Coffee',
      lunch: 'Chapati, Steamed Rice, Rajma Curry, Aloo Gobi, Buttermilk',
      snacks: 'Veg Grilled Sandwich, Cold Coffee',
      dinner: 'Phulka, Lemon Rice, Mix Veg Handi, Dal Fry, Kheer',
    },
    {
      day: 'Wednesday',
      breakfast: 'Masala Dosa, Tomato Chutney, Milk / Coffee',
      lunch: 'Roti, Veg Biryani, Mirchi Ka Salan, Boondi Raita, Salad',
      snacks: 'Kanda Poha, Sev, Masala Chai',
      dinner: 'Paratha, Steamed Rice, Egg Curry / Paneer Tikka Masala, Sweet',
    },
    {
      day: 'Thursday',
      breakfast: 'Aloo Paratha, Curd, Pickle, Tea',
      lunch: 'Phulka, Rice, Chana Masala, Bhindi Fry, Curd',
      snacks: 'Bread Pakora, Mint Chutney, Chai',
      dinner: 'Roti, Veg Fried Rice, Veg Manchurian, Tomato Soup',
    },
    {
      day: 'Friday',
      breakfast: 'Uttapam, Sambar, Chutney, Coffee',
      lunch: 'Chapati, Steamed Rice, Dal Makhani, Mix Veg, Salad',
      snacks: 'Crispy Corn, Lemonade / Tea',
      dinner: 'Butter Paratha, Hyderabadi Veg Dum Biryani, Raita, Rasgulla',
    },
    {
      day: 'Saturday',
      breakfast: 'Poha & Jalebi, Sprouts, Special Tea',
      lunch: 'Roti, Curd Rice, Aloo Baingan, Dal Tadka, Papad',
      snacks: 'Veg Cutlet, Tomato Sauce, Tea',
      dinner: 'Phulka, Peas Pulao, Paneer Do Pyaza, Moong Dal Halwa',
    },
    {
      day: 'Sunday',
      breakfast: 'Chole Bhature, Sweet Lassi / Coffee',
      lunch: 'Special Sunday Feast: Paneer Pasanda, Veg Pulao, Dal Makhani, Ice Cream',
      snacks: 'Pasta / Pav Bhaji, Iced Tea',
      dinner: 'Light Phulka, Khichdi, Kadhi, Papad, Pickle',
    },
  ];

  const nearbyPlacesList: NearbyPlaceItem[] = [
    {
      id: 'nb-1',
      category: 'Metro',
      name: `${prop.area || prop.city} Metro Station`,
      distance: '0.4 km',
      travelTime: '5 mins walk',
    },
    {
      id: 'nb-2',
      category: 'Bus Stop',
      name: `${prop.area || prop.city} Main Junction Stop`,
      distance: '0.2 km',
      travelTime: '2 mins walk',
    },
    {
      id: 'nb-3',
      category: 'College',
      name: `City Institute of Technology & Management`,
      distance: '1.4 km',
      travelTime: '5 mins ride',
    },
    {
      id: 'nb-4',
      category: 'University',
      name: `Global University Campus`,
      distance: '2.8 km',
      travelTime: '10 mins ride',
    },
    {
      id: 'nb-5',
      category: 'Company',
      name: `Tech Park & IT Cyber Hub`,
      distance: '1.1 km',
      travelTime: '4 mins ride',
    },
    {
      id: 'nb-6',
      category: 'Hospital',
      name: `Apollo Multi-Specialty Hospital`,
      distance: '0.8 km',
      travelTime: '3 mins ride',
    },
    {
      id: 'nb-7',
      category: 'Mall',
      name: `Nexus Central Shopping Mall`,
      distance: '1.5 km',
      travelTime: '6 mins ride',
    },
    {
      id: 'nb-8',
      category: 'ATM',
      name: `HDFC Bank 24/7 ATM`,
      distance: '0.1 km',
      travelTime: '1 min walk',
    },
    {
      id: 'nb-9',
      category: 'Restaurant',
      name: `Food Court & Multicuisine Dining`,
      distance: '0.3 km',
      travelTime: '3 mins walk',
    },
    {
      id: 'nb-10',
      category: 'Medical Store',
      name: `24/7 MedPlus Pharmacy`,
      distance: '0.1 km',
      travelTime: '1 min walk',
    },
  ];

  const reviewsList: DetailedReview[] = [
    {
      id: 'rev-1',
      author: 'Ananya Rao',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      rating: 5,
      date: '2 weeks ago',
      comment:
        'Living here has been an incredible experience! The study room is quiet during exam weeks, high-speed Wi-Fi never drops, and the food menu is surprisingly varied and hygienic.',
      helpfulCount: 24,
      verifiedResident: true,
      residentRoom: 'Single Sharing • Room 304',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80',
      ],
    },
    {
      id: 'rev-2',
      author: 'Rahul Menon',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      rating: 5,
      date: '1 month ago',
      comment:
        '3-tier biometric security and 24/7 power backup make this stay feel super safe and reliable when working late shifts. The manager is extremely helpful.',
      helpfulCount: 38,
      verifiedResident: true,
      residentRoom: 'Double Sharing • Room 212',
    },
    {
      id: 'rev-3',
      author: 'Sneha Iyer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      rating: 4,
      date: '2 months ago',
      comment:
        'Great location close to metro and office hubs. Housekeeping comes daily and keeps common rooms spotless. Highly recommended for working professionals!',
      helpfulCount: 19,
      verifiedResident: true,
      residentRoom: 'Triple Sharing • Room 108',
      images: [
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=400&q=80',
      ],
    },
    {
      id: 'rev-4',
      author: 'Vikramaditya K',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      rating: 5,
      date: '3 months ago',
      comment:
        'The Sunday special meals are top notch! Very polite warden, smooth move-in process without any hidden charges or unexpected deposit delays.',
      helpfulCount: 15,
      verifiedResident: true,
      residentRoom: 'Single Sharing • Room 402',
    },
  ];

  const galleryImages = prop.images && prop.images.length > 1
    ? prop.images.map((url, idx) => ({
        url,
        title: `${prop.name || prop.title} Image ${idx + 1}`,
        category: idx === 0 ? 'Cover' : idx === 1 ? 'Bedroom' : 'Amenities',
      }))
    : DEFAULT_GALLERY_IMAGES;

  return {
    ...prop,
    pincode: cityInfo.pincode,
    state: cityInfo.state,
    securityDeposit,
    advanceDeposit,
    bookingFee,
    maintenance,
    electricity,
    water,
    foodCharges,
    laundryCharges,
    gstAmount,
    totalMoveInCost,
    moveInDate: prop.available || 'Immediate Move-in Available',
    virtualTourUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    videoTourUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    sharingCards,
    foodMenu,
    foodTimings: {
      breakfast: '7:30 AM – 9:30 AM',
      lunch: '12:30 PM – 2:30 PM',
      snacks: '5:00 PM – 6:30 PM',
      dinner: '8:00 PM – 10:00 PM',
    },
    messRules: [
      'Freshly prepared hot meals served 4 times a day',
      'Both Vegetarian & Non-Vegetarian options provided',
      'Inform kitchen staff 3 hours in advance for late dinner requests',
      'Self-service dining area cleaned and sanitized after every meal',
      'Special festive meals and weekend desserts included without extra charge',
    ],
    houseRulesList: {
      curfew: 'Main entrance gate locks at 11:00 PM. Late entry permitted with registered guardian/owner approval.',
      visitorPolicy: 'Visitors allowed in ground floor common lounge between 9:00 AM – 8:00 PM with ID log.',
      smokingPolicy: 'Strictly zero smoking inside bedrooms, corridors, or dining halls. Designated rooftop zone provided.',
      drinkingPolicy: 'Alcohol and illegal substances are strictly prohibited on property premises.',
      refundPolicy: '100% full refund of booking fee if cancelled within 24 hours of booking.',
      cancellationPolicy: '30 days prior written notice required before vacating. Security deposit refunded in 15 working days.',
      general: [
        'Maintain quiet hours from 10:30 PM to 6:30 AM',
        'Keep common areas and study rooms neat after personal use',
        'Turn off lights, fans, and AC when leaving the room',
        'Report maintenance issues through the Nestin tenant app for 24-hr resolution',
      ],
    },
    nearbyPlacesList,
    galleryImages,
    reviewsList,
  };
}

export function detailedPropertyToOwnerPropertyListing(detailed: DetailedProperty): import('../types/property').OwnerPropertyListing {
  const minRent = detailed.rent || detailed.price || 14500;
  
  const rooms: import('../types/property').PropertyRoom[] = detailed.sharingCards.map((sc, idx) => ({
    id: sc.id || `room-${idx + 1}`,
    name: `${sc.type} Suite`,
    type: (sc.type.includes('Single')
      ? 'Single Sharing'
      : sc.type.includes('Double')
      ? 'Double Sharing'
      : sc.type.includes('Triple')
      ? 'Triple Sharing'
      : sc.type.includes('Four')
      ? 'Four Sharing'
      : 'Dormitory') as any,
    sharingTypeSlug: sc.type.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    floor: idx + 1,
    sizeSqFt: parseInt(sc.roomSize) || 200,
    capacity: sc.bedsCount || 1,
    availableBedsCount: sc.availability.includes('Available') ? 2 : 1,
    occupiedBedsCount: 0,
    bathroomType: sc.attachedBathroom ? 'Attached Bathroom' : 'Common Washroom',
    hasAC: sc.airConditioning,
    hasBalcony: sc.balcony,
    furnishing: 'Fully Furnished',
    monthlyRent: sc.rent,
    securityDeposit: sc.rent * 2,
    bookingFee: 999,
    maintenance: 800,
    beds: Array.from({ length: sc.bedsCount || 1 }).map((_, bIdx) => ({
      id: `bed-${sc.id}-${bIdx + 1}`,
      bedNumber: `Bed ${String.fromCharCode(65 + bIdx)}`,
      isOccupied: false,
    })),
  }));

  const amenitiesList: import('../types/property').PropertyAmenityItem[] = (detailed.amenities || [
    '300 Mbps High-Speed Wi-Fi',
    '3 Times Fresh Meals',
    'Daily Room Cleaning',
    '24/7 Power Backup',
    'Biometric & CCTV Security',
    'RO Water Purifier',
    'Automatic Washing Machines',
    'Fully Air Conditioned',
  ]).map((name, i) => {
    let iconKey = 'sparkles';
    const lower = name.toLowerCase();
    if (lower.includes('wi-fi') || lower.includes('internet')) iconKey = 'wifi';
    else if (lower.includes('meal') || lower.includes('food') || lower.includes('dining')) iconKey = 'utensils';
    else if (lower.includes('clean') || lower.includes('housekeeping')) iconKey = 'brush';
    else if (lower.includes('power') || lower.includes('backup') || lower.includes('generator')) iconKey = 'zap';
    else if (lower.includes('cctv') || lower.includes('security') || lower.includes('biometric')) iconKey = 'shield-check';
    else if (lower.includes('water') || lower.includes('ro')) iconKey = 'droplets';
    else if (lower.includes('laundry') || lower.includes('washing')) iconKey = 'shirt';
    else if (lower.includes('ac') || lower.includes('air')) iconKey = 'wind';
    else if (lower.includes('gym') || lower.includes('fitness')) iconKey = 'dumbbell';

    return {
      id: `am-${i + 1}`,
      name,
      category: 'Comfort',
      iconKey,
      subtext: 'Provided free for all residents',
      isAvailable: true,
    };
  });

  const nearbyPlaces: import('../types/property').PropertyNearbyPlace[] = detailed.nearbyPlacesList.map((nb) => ({
    id: nb.id,
    category: nb.category,
    name: nb.name,
    distanceKm: parseFloat(nb.distance) || 0.8,
    travelTime: nb.travelTime,
    travelMode: nb.travelTime.includes('walk') ? 'walk' : 'ride',
  }));

  const reviews: import('../types/property').PropertyResidentReview[] = detailed.reviewsList.map((r) => ({
    id: r.id,
    author: r.author,
    avatar: r.avatar,
    rating: r.rating,
    date: r.date,
    comment: r.comment,
    helpfulCount: r.helpfulCount,
    verifiedResident: r.verifiedResident,
    residentRoom: r.residentRoom,
    images: r.images,
  }));

  const gallery: import('../types/property').PropertyMediaItem[] = detailed.galleryImages.map((g, idx) => ({
    id: `gal-${idx + 1}`,
    url: g.url,
    title: g.title,
    category: g.category as any,
    isCover: idx === 0,
  }));

  return {
    id: detailed.id || `prop-${detailed.slug}`,
    ownerId: 'owner-current',
    ownerName: 'Paritala Venkata Vaibhav',
    ownerEmail: 'venkatavaibhavparitala@gmail.com',
    slug: detailed.slug || (detailed.title || detailed.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: detailed.title || detailed.name || 'Nestin Verified Stay',
    type: 'Co-living',
    category: detailed.gender === 'Boys' ? 'Men' : detailed.gender === 'Girls' ? 'Women' : 'Co-ed',
    status: 'published',
    completenessScore: 100,
    floors: 4,
    contactNumber: '+91 98765 43210',
    propertyEmail: 'host@nestin.io',
    website: 'https://nestin.io',
    shortDescription: detailed.description || 'Premium co-living property with verified amenities.',
    longDescription: detailed.description || 'Spacious, clean rooms with high speed Wi-Fi and nutritious meals.',
    tags: detailed.tags || ['Co-living', 'Verified', 'Zero Brokerage'],
    isNestinVerified: detailed.verified ?? true,
    isFeatured: detailed.featured ?? false,
    isZeroBrokerage: true,
    coverImage: detailed.image || detailed.galleryImages[0]?.url,
    gallery,
    videoTourUrl: detailed.videoTourUrl,
    virtualTour360Url: detailed.virtualTourUrl,
    details: {
      totalRooms: 16,
      totalBeds: 36,
      totalFloors: 4,
      capacity: 36,
      parkingAvailable: true,
      parkingType: 'Both',
      powerBackup: '24/7 Generator Backup',
      waterSupply: '24/7 RO Purified Water',
      securityType: '3-Tier Biometric & CCTV',
      cctv: true,
      biometricAccess: true,
      housekeeping: 'Daily Room Cleaning & Trash Removal',
      laundry: 'Fully Automatic Washing Machines',
    },
    rooms,
    pricing: {
      minRent,
      securityDepositRefundPolicy: '100% Refundable within 15 working days of moving out',
      electricity: { type: 'Metered', amount: detailed.electricity || 1200, label: 'As per personal sub-meter' },
      water: { type: 'Included', amount: 0, label: 'Free 24/7 RO Purified Supply' },
      foodMess: {
        type: detailed.food ? 'Included' : 'Optional',
        mealsPerDay: 4,
        label: detailed.food ? 'Included (Breakfast, Lunch, Snacks, Dinner)' : 'Optional meal subscription',
      },
      laundryAndHousekeeping: { type: 'Included', label: 'Daily Cleaning Included' },
      maintenance: { type: 'Included', amount: detailed.maintenance || 800, label: 'Included in monthly rent' },
      bookingFee: detailed.bookingFee || 999,
    },
    amenities: amenitiesList,
    policies: {
      curfew: detailed.houseRulesList.curfew,
      visitorPolicy: detailed.houseRulesList.visitorPolicy,
      smokingAndAlcohol: detailed.houseRulesList.smokingPolicy,
      cancellationPolicy: detailed.houseRulesList.cancellationPolicy,
      noticePeriod: '30 Days written notice before vacating',
      petPolicy: 'Pets not allowed in shared rooms',
      guestPolicy: 'Day visitors allowed in ground lounge until 8:00 PM',
      ageRestrictions: '18–40 years (Students & Working Professionals)',
      genderPolicy: detailed.gender === 'Boys' ? 'Men Only' : detailed.gender === 'Girls' ? 'Women Only' : 'Co-ed',
      additionalRules: detailed.houseRulesList.general,
    },
    location: {
      addressLine1: detailed.address || `${detailed.area}, ${detailed.city}`,
      area: detailed.area || detailed.city,
      city: detailed.city,
      state: detailed.state,
      pincode: detailed.pincode,
      latitude: detailed.latitude || 17.4485,
      longitude: detailed.longitude || 78.3741,
      formattedAddress: detailed.location || `${detailed.address || detailed.area}, ${detailed.city}, ${detailed.state}`,
      distanceLabel: detailed.distance || 'Near Transit',
      moveInAvailabilityLabel: detailed.moveInDate || 'Available Now',
    },
    nearbyPlaces,
    caretaker: {
      name: detailed.caretaker?.name || 'Suresh Kumar',
      phone: detailed.caretaker?.phone || '+91 98765 43210',
      isIdentityVerified: detailed.caretaker?.verified ?? true,
      isBackgroundVerified: true,
      isPubliclyVisible: true,
    },
    documents: [],
    systemMetrics: {
      averageRating: detailed.rating || 4.8,
      totalReviews: detailed.reviewsCount || 42,
      ratingBreakdown: { 5: 35, 4: 5, 3: 2, 2: 0, 1: 0 },
      totalBookingsCount: 88,
      viewsCount: 1420,
      createdAt: '2025-01-10T10:00:00Z',
      lastUpdatedAt: '2026-01-15T12:00:00Z',
    },
    reviews,
  };
}
