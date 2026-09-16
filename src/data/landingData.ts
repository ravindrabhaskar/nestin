import { FeatureItem, CityItem, TestimonialItem, FAQItem, PropertyListing } from '../types';

export const STATS_DATA = [
  { value: 15000, suffix: '+', label: 'Verified stays' },
  { value: 200000, display: '2L+', label: 'Happy residents' },
  { value: 50, suffix: '+', label: 'Cities across India' },
  { value: 24, suffix: '/7', label: 'Support' },
];

export const TRUST_POINTS = [
  'Verified photos and property details',
  'Audited caretakers with background checks',
  'Clean, safe, well-managed hostels',
  'Easy move-in with zero hassle',
];

export const COMMUNITY_POINTS = [
  'Furnished rooms with modern amenities',
  'Shared common areas and social events',
  'Healthy food and housekeeping options',
  'Flexible tenures that work for you',
];

export const WHY_NESTIN_FEATURES: FeatureItem[] = [
  {
    id: 'verified-stays',
    icon: 'ShieldCheck',
    title: 'Verified stays',
    description: 'Every property is checked for safety, cleanliness, and accurate details.',
  },
  {
    id: 'simple-booking',
    icon: 'Building2',
    title: 'Simple booking',
    description: 'Compare homes, schedule a visit, and reserve your room online.',
  },
  {
    id: 'digital-agreements',
    icon: 'FileText',
    title: 'Digital agreements',
    description: 'Keep payment records, receipts and agreements in one safe place.',
  },
  {
    id: 'transparent-pricing',
    icon: 'Tag',
    title: 'Transparent pricing',
    description: 'Know what you pay before you move in. No unexpected charges.',
  },
  {
    id: 'movein-support',
    icon: 'Truck',
    title: 'Move-in support',
    description: 'Our support team helps make your move smooth from day one.',
  },
  {
    id: 'concierge-support',
    icon: 'LifeBuoy',
    title: '24/7 Concierge',
    description: 'Central helpdesk, emergency SOS support, and rapid maintenance fixes.',
  },
];

export const STEPS_DATA = [
  {
    step: '01',
    title: 'Search smart',
    description: 'Choose your city, preferred area, budget, and move-in date.',
    popoverText: 'Search by city, college, office location, or landmark. Filter by budget, room type, and preferred move-in date. Save searches and get notified when new matches arrive.',
    cta: 'Explore stays →',
  },
  {
    step: '02',
    title: 'Compare with confidence',
    description: 'Review verified photos, prices, amenities, and resident ratings.',
    popoverText: 'Every listed stay includes verified photos and transparent details. Read real reviews from current residents, compare amenity checklists, and shortlist your favourites.',
    cta: 'See verified homes →',
  },
  {
    step: '03',
    title: 'Book your stay',
    description: 'Schedule a visit, reserve your room, and complete your agreement online.',
    popoverText: 'Choose a visit slot that suits you — in-person or virtual. Once satisfied, reserve the room and sign your digital rental agreement in minutes.',
    cta: 'Book a visit →',
  },
  {
    step: '04',
    title: 'Move in easily',
    description: 'Arrive at a safe, comfortable place that is ready for you.',
    popoverText: 'Get support from confirmation through move-in day. Your room is cleaned, inspected, and ready before you arrive. Our team is on hand to help you settle in.',
    cta: 'Get move-in support →',
  },
];

export const CITIES_DATA: CityItem[] = [
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    stays: '4,200+ stays',
    image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
    description: 'Koramangala, HSR Layout, Indiranagar, Whitefield',
    avgPrice: '₹8,500/mo',
    state: 'Karnataka',
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    stays: '3,100+ stays',
    image: 'https://images.unsplash.com/photo-1605649487212-47bdab064df8?auto=format&fit=crop&w=800&q=80',
    description: 'Hitec City, Gachibowli, Madhapur, Kondapur',
    avgPrice: '₹7,500/mo',
    state: 'Telangana',
  },
  {
    id: 'pune',
    name: 'Pune',
    stays: '2,800+ stays',
    image: 'https://images.unsplash.com/photo-1571679654681-ba01b9e1e117?auto=format&fit=crop&w=800&q=80',
    description: 'Viman Nagar, Hinjewadi, Baner, Kothrud',
    avgPrice: '₹7,000/mo',
    state: 'Maharashtra',
  },
  {
    id: 'delhi-ncr',
    name: 'Delhi NCR',
    stays: '5,000+ stays',
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
    description: 'Gurugram, Noida, South Delhi, North Campus',
    avgPrice: '₹9,000/mo',
    state: 'Delhi NCR',
  },
  {
    id: 'chennai',
    name: 'Chennai',
    stays: '2,100+ stays',
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    description: 'OMR, Velachery, Guindy, Anna Nagar',
    avgPrice: '₹6,500/mo',
    state: 'Tamil Nadu',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    stays: '3,800+ stays',
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80',
    description: 'Andheri, Powai, Bandra, Navi Mumbai',
    avgPrice: '₹12,000/mo',
    state: 'Maharashtra',
  },
];

export const TESTIMONIALS_DATA: TestimonialItem[] = [
  {
    id: '1',
    name: 'Ananya S.',
    role: 'Software Engineer',
    city: 'Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    initials: 'AS',
    text: 'Moved to Bengaluru with no local contacts. Found a verified place in HSR Layout within 2 days. The zero-brokerage promise is 100% real!',
    rating: 5,
  },
  {
    id: '2',
    name: 'Rahul V.',
    role: 'Product Designer',
    city: 'Hyderabad',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    initials: 'RV',
    text: 'The 360-degree tour matched the actual room completely. Digital rent receipts make expense filing super easy. Highly recommended.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Pooja M.',
    role: 'Medical Student',
    city: 'Pune',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    initials: 'PM',
    text: 'Safety was my parents’ top concern. The biometric entry and verified warden gave us complete peace of mind. Great student community!',
    rating: 5,
  },
];

export const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How does NestIn verify properties?',
    answer: 'Every property listed on NestIn undergoes a 40-point physical inspection by our ground audit team. We verify fire safety, CCTV surveillance, Wi-Fi speed, water filtration (RO), and room dimensions before awarding the verified badge.',
    category: 'General',
  },
  {
    id: '2',
    question: 'Are there any brokerage or hidden charges?',
    answer: 'No. NestIn is 100% free from brokerage charges. All prices, security deposits, and maintenance terms are listed with complete transparency upfront.',
    category: 'Booking & Payment',
  },
  {
    id: '3',
    question: 'Can I schedule a property visit before booking?',
    answer: 'Yes! You can book an in-person physical visit or a live video walkthrough directly through the platform at any time that suits your schedule.',
    category: 'Visits',
  },
  {
    id: '4',
    question: 'How do rent payments and agreements work?',
    answer: 'All payments can be made securely via UPI, NetBanking, or Credit Cards with automated digital receipts. Rental agreements are generated digitally with zero paperwork.',
    category: 'Booking & Payment',
  },
];
