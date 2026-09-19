// ---------------------------------------------------------------------------
// CRM ENTITY TYPES
// ---------------------------------------------------------------------------

export type LeadStage =
  'New' | 'Contacted' | 'Visit Scheduled' | 'Visited' | 'Interested' | 'Booking Requested' | 'Converted' | 'Lost';

export type LeadSource = 'Nestin' | 'Website' | 'Phone' | 'WhatsApp' | 'Walk-in' | 'Referral' | 'Other';

export interface CRMActivityLog {
  id: string;
  action: string;
  description: string;
  date: string;
  time: string;
  user: string;
  type: 'lead' | 'booking' | 'visit' | 'customer' | 'payment' | 'document' | 'general';
}

export interface LeadItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  preferredLocation?: string;
  propertyId: string;
  propertyName: string;
  roomType: string;
  budget: number;
  preferredMoveInDate?: string;
  source: LeadSource;
  stage: LeadStage;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  assignedTo: string;
  notes?: string;
  createdAt: string;
  visitorId?: string;
  bookingId?: string;
  customerId?: string;
  lostReason?: string;
  timeline: CRMActivityLog[];
}

export type BookingStatus = 'Pending' | 'Confirmed' | 'Rejected' | 'Cancelled' | 'Completed';

export type PaymentStatus = 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'Refunded';

export interface BookingItem {
  id: string;
  bookingNumber: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  tenantAvatar?: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
  propertyImage?: string;
  roomId: string;
  roomName: string;
  roomType: string;
  bedId: string;
  bedNumber: string;
  moveInDate: string;
  expectedMoveOutDate?: string;
  durationMonths: number;
  monthlyRent: number;
  securityDeposit: number;
  bookingFee: number;
  maintenanceCharges: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  notes?: string;
  createdAt: string;
  leadId?: string;
  customerId?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  timeline: CRMActivityLog[];
}

export type VisitorStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-show';

export interface VisitorItem {
  id: string;
  visitorName: string;
  phone: string;
  email?: string;
  propertyId: string;
  propertyName: string;
  preferredRoom?: string;
  visitDate: string;
  visitTime: string;
  numberOfVisitors: number;
  purpose: string;
  assignedTo: string;
  status: VisitorStatus;
  notes?: string;
  leadId?: string;
  createdAt: string;
  timeline: CRMActivityLog[];
}

export type CustomerTenantStatus = 'Active' | 'Upcoming' | 'Vacating' | 'Inactive';

export interface CustomerDocumentItem {
  id: string;
  name: string;
  type: 'govt_id' | 'address_proof' | 'employment_proof' | 'agreement' | 'other';
  documentNumber?: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  fileUrl?: string;
}

export interface CustomerPaymentRecord {
  id: string;
  paymentId: string;
  date: string;
  propertyId: string;
  propertyName: string;
  rentAmount: number;
  additionalCharges: number;
  totalAmount: number;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Credit Card' | 'Cash' | 'Auto-Debit';
  status: 'Completed' | 'Pending' | 'Failed';
  receiptNumber: string;
  description: string;
}

export interface CustomerItem {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  avatar?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
  roomId: string;
  roomName: string;
  roomType: string;
  bedId: string;
  bedNumber: string;
  moveInDate: string;
  expectedMoveOutDate?: string;
  monthlyRent: number;
  securityDeposit: number;
  paymentStatus: PaymentStatus;
  tenantStatus: CustomerTenantStatus;
  notes?: string;
  createdAt: string;
  leadId?: string;
  bookingId?: string;
  documents: CustomerDocumentItem[];
  paymentHistory: CustomerPaymentRecord[];
  visitHistory: Array<{
    visitId: string;
    date: string;
    propertyName: string;
    status: string;
  }>;
  timeline: CRMActivityLog[];
}

export interface OwnerCRMNotification {
  id: string;
  title: string;
  message: string;
  type: 'lead' | 'booking' | 'visit' | 'customer' | 'payment' | 'system';
  timestamp: string;
  isRead: boolean;
  linkTo?: string;
}
