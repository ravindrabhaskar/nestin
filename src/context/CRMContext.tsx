import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  LeadItem,
  LeadStage,
  BookingItem,
  BookingStatus,
  VisitorItem,
  VisitorStatus,
  CustomerItem,
  CustomerTenantStatus,
  CRMActivityLog,
  OwnerCRMNotification,
  CustomerDocumentItem,
  CustomerPaymentRecord,
} from '../types/crm';
import {
  INITIAL_LEADS_SEED,
  INITIAL_BOOKINGS_SEED,
  INITIAL_VISITORS_SEED,
  INITIAL_CUSTOMERS_SEED,
  INITIAL_AUDIT_LOGS_SEED,
} from '../data/crmSeedData';
import { usePropertyListing } from './PropertyListingContext';

interface CRMContextType {
  // Leads
  leads: LeadItem[];
  getLeadById: (id: string) => LeadItem | null;
  createLead: (lead: Omit<LeadItem, 'id' | 'createdAt' | 'timeline'>) => string;
  updateLead: (id: string, updates: Partial<LeadItem>) => void;
  updateLeadStage: (id: string, stage: LeadStage, note?: string) => void;
  deleteLead: (id: string) => void;
  addLeadNote: (id: string, noteText: string) => void;
  logLeadContact: (id: string, method: 'call' | 'whatsapp' | 'email', notes?: string) => void;
  importLeads: (newLeads: Array<Omit<LeadItem, 'id' | 'createdAt' | 'timeline'>>) => number;

  // Bookings
  bookings: BookingItem[];
  getBookingById: (id: string) => BookingItem | null;
  createBooking: (booking: Omit<BookingItem, 'id' | 'bookingNumber' | 'createdAt' | 'timeline'>) => string;
  updateBooking: (id: string, updates: Partial<BookingItem>) => void;
  approveBooking: (bookingId: string) => { success: boolean; customerId: string };
  rejectBooking: (bookingId: string, reason: string) => void;
  cancelBooking: (bookingId: string, reason: string) => void;
  completeMoveIn: (bookingId: string) => void;

  // Visitors
  visitors: VisitorItem[];
  getVisitorById: (id: string) => VisitorItem | null;
  scheduleVisit: (visit: Omit<VisitorItem, 'id' | 'createdAt' | 'timeline'>) => string;
  updateVisitor: (id: string, updates: Partial<VisitorItem>) => void;
  updateVisitorStatus: (id: string, status: VisitorStatus, note?: string) => void;
  deleteVisitor: (id: string) => void;

  // Customers
  customers: CustomerItem[];
  getCustomerById: (id: string) => CustomerItem | null;
  findCustomerByContact: (phone: string, email?: string) => CustomerItem | null;
  createCustomer: (customer: Omit<CustomerItem, 'id' | 'createdAt' | 'timeline' | 'documents' | 'paymentHistory' | 'visitHistory'>) => { customerId: string; isDuplicate: boolean };
  updateCustomer: (id: string, updates: Partial<CustomerItem>) => void;
  addCustomerDocument: (customerId: string, doc: Omit<CustomerDocumentItem, 'id' | 'uploadedAt'>) => void;
  verifyCustomerDocument: (customerId: string, docId: string, status: 'verified' | 'rejected') => void;
  addCustomerPayment: (customerId: string, payment: Omit<CustomerPaymentRecord, 'id' | 'receiptNumber'>) => void;
  recordCustomerMoveOut: (customerId: string, moveOutDate: string, reason?: string) => void;
  deleteCustomer: (id: string) => void;

  // Global Audit & Notifications
  auditLogs: CRMActivityLog[];
  notifications: OwnerCRMNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notification: Omit<OwnerCRMNotification, 'id' | 'timestamp' | 'isRead'>) => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const LEADS_STORAGE_KEY = 'nestin_crm_leads_v2';
const BOOKINGS_STORAGE_KEY = 'nestin_crm_bookings_v2';
const VISITORS_STORAGE_KEY = 'nestin_crm_visitors_v2';
const CUSTOMERS_STORAGE_KEY = 'nestin_crm_customers_v2';
const AUDIT_STORAGE_KEY = 'nestin_crm_audit_logs_v2';
const NOTIFICATIONS_STORAGE_KEY = 'nestin_crm_notifications_v2';

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { updateBedStatus, properties } = usePropertyListing();

  // 1. Leads State
  const [leads, setLeads] = useState<LeadItem[]>(() => {
    try {
      const saved = localStorage.getItem(LEADS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_LEADS_SEED;
  });

  // 2. Bookings State
  const [bookings, setBookings] = useState<BookingItem[]>(() => {
    try {
      const saved = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_BOOKINGS_SEED;
  });

  // 3. Visitors State
  const [visitors, setVisitors] = useState<VisitorItem[]>(() => {
    try {
      const saved = localStorage.getItem(VISITORS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_VISITORS_SEED;
  });

  // 4. Customers State
  const [customers, setCustomers] = useState<CustomerItem[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_CUSTOMERS_SEED;
  });

  // 5. Audit logs State
  const [auditLogs, setAuditLogs] = useState<CRMActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_AUDIT_LOGS_SEED;
  });

  // 6. Notifications State
  const [notifications, setNotifications] = useState<OwnerCRMNotification[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: 'notif-1',
        title: 'New Booking Request',
        message: 'Priya Sundaram submitted booking request for Room 201.',
        type: 'booking',
        timestamp: '20 Aug 2026, 01:30 PM',
        isRead: false,
        linkTo: '/owner/bookings',
      },
      {
        id: 'notif-2',
        title: 'Upcoming Visit Today',
        message: 'Walkthrough scheduled with Sneha Patel at 11:30 AM.',
        type: 'visit',
        timestamp: '20 Aug 2026, 09:00 AM',
        isRead: false,
        linkTo: '/owner/visitors',
      },
    ];
  });

  // LocalStorage sync
  useEffect(() => {
    try {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
    } catch {}
  }, [leads]);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    } catch {}
  }, [bookings]);

  useEffect(() => {
    try {
      localStorage.setItem(VISITORS_STORAGE_KEY, JSON.stringify(visitors));
    } catch {}
  }, [visitors]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
    } catch {}
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // Helper date formatter
  const getFormattedNow = () => {
    const d = new Date();
    return {
      date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const addAuditLog = (
    action: string,
    description: string,
    type: CRMActivityLog['type'],
    user: string = 'Paritala Venkata Vaibhav'
  ) => {
    const { date, time } = getFormattedNow();
    const newLog: CRMActivityLog = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      description,
      date,
      time,
      user,
      type,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    return newLog;
  };

  const addNotification = (notif: Omit<OwnerCRMNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const { date, time } = getFormattedNow();
    const newN: OwnerCRMNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: `${date}, ${time}`,
      isRead: false,
    };
    setNotifications((prev) => [newN, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // ---------------------------------------------------------------------------
  // LEADS METHODS
  // ---------------------------------------------------------------------------
  const getLeadById = (id: string): LeadItem | null => {
    return leads.find((l) => l.id === id) || null;
  };

  const createLead = (data: Omit<LeadItem, 'id' | 'createdAt' | 'timeline'>): string => {
    const id = `lead-${Date.now()}`;
    const { date, time } = getFormattedNow();
    const initialActivity: CRMActivityLog = {
      id: `lact-${Date.now()}`,
      action: 'Lead Created',
      description: `New lead created from ${data.source} for ${data.propertyName || 'Property'}.`,
      date,
      time,
      user: 'Owner Portal',
      type: 'lead',
    };

    const newLead: LeadItem = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      timeline: [initialActivity],
    };

    setLeads((prev) => [newLead, ...prev]);
    addAuditLog('Lead Created', `Added new lead: ${data.fullName} (${data.phone})`, 'lead');
    addNotification({
      title: 'New Lead Added',
      message: `${data.fullName} registered interest for ${data.propertyName}.`,
      type: 'lead',
      linkTo: '/owner/leads',
    });

    return id;
  };

  const updateLead = (id: string, updates: Partial<LeadItem>) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        return { ...l, ...updates };
      })
    );
  };

  const updateLeadStage = (id: string, stage: LeadStage, note?: string) => {
    const { date, time } = getFormattedNow();
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const stageActivity: CRMActivityLog = {
          id: `lact-${Date.now()}`,
          action: 'Stage Changed',
          description: `Stage moved from "${l.stage}" to "${stage}". ${note ? `Note: ${note}` : ''}`,
          date,
          time,
          user: 'Paritala Venkata Vaibhav',
          type: 'lead',
        };
        return {
          ...l,
          stage,
          lastContactDate: new Date().toISOString().split('T')[0],
          timeline: [stageActivity, ...l.timeline],
        };
      })
    );
    addAuditLog('Lead Stage Updated', `Lead stage changed to ${stage}`, 'lead');
  };

  const deleteLead = (id: string) => {
    const target = leads.find((l) => l.id === id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    if (target) {
      addAuditLog('Lead Deleted', `Deleted lead record: ${target.fullName}`, 'lead');
    }
  };

  const addLeadNote = (id: string, noteText: string) => {
    const { date, time } = getFormattedNow();
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const noteActivity: CRMActivityLog = {
          id: `lact-${Date.now()}`,
          action: 'Note Added',
          description: noteText,
          date,
          time,
          user: 'Paritala Venkata Vaibhav',
          type: 'lead',
        };
        const updatedNotes = l.notes ? `${l.notes}\n[${date}]: ${noteText}` : noteText;
        return {
          ...l,
          notes: updatedNotes,
          timeline: [noteActivity, ...l.timeline],
        };
      })
    );
  };

  const logLeadContact = (id: string, method: 'call' | 'whatsapp' | 'email', notes?: string) => {
    const { date, time } = getFormattedNow();
    const actionLabel = method === 'call' ? 'Call Made' : method === 'whatsapp' ? 'WhatsApp Sent' : 'Email Sent';
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const contactActivity: CRMActivityLog = {
          id: `lact-${Date.now()}`,
          action: actionLabel,
          description: notes || `${actionLabel} to prospect ${l.fullName} (${l.phone}).`,
          date,
          time,
          user: 'Paritala Venkata Vaibhav',
          type: 'lead',
        };
        const nextStage: LeadStage = l.stage === 'New' ? 'Contacted' : l.stage;
        return {
          ...l,
          stage: nextStage,
          lastContactDate: new Date().toISOString().split('T')[0],
          timeline: [contactActivity, ...l.timeline],
        };
      })
    );
    addAuditLog(actionLabel, `Contacted ${id} via ${method}`, 'lead');
  };

  const importLeads = (newLeadsData: Array<Omit<LeadItem, 'id' | 'createdAt' | 'timeline'>>): number => {
    let count = 0;
    const { date, time } = getFormattedNow();
    const createdLeads: LeadItem[] = newLeadsData.map((d, index) => {
      count++;
      return {
        ...d,
        id: `lead-imp-${Date.now()}-${index}`,
        createdAt: new Date().toISOString(),
        timeline: [
          {
            id: `lact-imp-${index}`,
            action: 'Lead Imported',
            description: `Batch CSV import from ${d.source}.`,
            date,
            time,
            user: 'CSV Bulk Importer',
            type: 'lead',
          },
        ],
      };
    });
    setLeads((prev) => [...createdLeads, ...prev]);
    addAuditLog('Bulk Leads Imported', `Imported ${count} new leads via CSV`, 'lead');
    return count;
  };

  // ---------------------------------------------------------------------------
  // VISITORS METHODS
  // ---------------------------------------------------------------------------
  const getVisitorById = (id: string): VisitorItem | null => {
    return visitors.find((v) => v.id === id) || null;
  };

  const scheduleVisit = (data: Omit<VisitorItem, 'id' | 'createdAt' | 'timeline'>): string => {
    const id = `vis-${Date.now()}`;
    const { date, time } = getFormattedNow();
    const initialActivity: CRMActivityLog = {
      id: `vact-${Date.now()}`,
      action: 'Visit Scheduled',
      description: `Visit scheduled for ${data.visitDate} at ${data.visitTime} (${data.numberOfVisitors} visitor(s)).`,
      date,
      time,
      user: 'Paritala Venkata Vaibhav',
      type: 'visit',
    };

    const newVisitor: VisitorItem = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      timeline: [initialActivity],
    };

    setVisitors((prev) => [newVisitor, ...prev]);

    // If linked to a lead, update lead timeline & stage to 'Visit Scheduled'
    if (data.leadId) {
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== data.leadId) return l;
          const leadActivity: CRMActivityLog = {
            id: `lact-vis-${Date.now()}`,
            action: 'Visit Scheduled',
            description: `Walkthrough booked for ${data.visitDate} at ${data.visitTime} at ${data.propertyName}.`,
            date,
            time,
            user: 'Paritala Venkata Vaibhav',
            type: 'visit',
          };
          return {
            ...l,
            stage: 'Visit Scheduled',
            visitorId: id,
            timeline: [leadActivity, ...l.timeline],
          };
        })
      );
    }

    addAuditLog('Visit Scheduled', `Scheduled visit with ${data.visitorName} on ${data.visitDate}`, 'visit');
    addNotification({
      title: 'Visit Scheduled',
      message: `${data.visitorName} will visit ${data.propertyName} on ${data.visitDate} at ${data.visitTime}.`,
      type: 'visit',
      linkTo: '/owner/visitors',
    });

    return id;
  };

  const updateVisitor = (id: string, updates: Partial<VisitorItem>) => {
    setVisitors((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        return { ...v, ...updates };
      })
    );
  };

  const updateVisitorStatus = (id: string, status: VisitorStatus, note?: string) => {
    const { date, time } = getFormattedNow();
    setVisitors((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const act: CRMActivityLog = {
          id: `vact-${Date.now()}`,
          action: `Status Updated to ${status}`,
          description: note || `Visit status updated to ${status}.`,
          date,
          time,
          user: 'Paritala Venkata Vaibhav',
          type: 'visit',
        };

        // If completed and linked to a lead, also progress lead to 'Visited' / 'Interested'
        if (status === 'Completed' && v.leadId) {
          updateLeadStage(v.leadId, 'Visited', 'Walkthrough completed by visitor.');
        }

        return {
          ...v,
          status,
          timeline: [act, ...v.timeline],
        };
      })
    );
    addAuditLog('Visit Status Updated', `Visitor ${id} status set to ${status}`, 'visit');
  };

  const deleteVisitor = (id: string) => {
    const target = visitors.find((v) => v.id === id);
    setVisitors((prev) => prev.filter((v) => v.id !== id));
    if (target) {
      addAuditLog('Visit Deleted', `Cancelled and removed visit for ${target.visitorName}`, 'visit');
    }
  };

  // ---------------------------------------------------------------------------
  // CUSTOMER MANAGEMENT & DUPLICATE CHECKS
  // ---------------------------------------------------------------------------
  const getCustomerById = (id: string): CustomerItem | null => {
    return customers.find((c) => c.id === id) || null;
  };

  const findCustomerByContact = (phone: string, email?: string): CustomerItem | null => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    return (
      customers.find((c) => {
        const cPhone = c.phone.replace(/\D/g, '').slice(-10);
        if (cleanPhone && cPhone && cleanPhone === cPhone) return true;
        if (email && c.email && c.email.toLowerCase() === email.toLowerCase().trim()) return true;
        return false;
      }) || null
    );
  };

  const createCustomer = (
    data: Omit<CustomerItem, 'id' | 'createdAt' | 'timeline' | 'documents' | 'paymentHistory' | 'visitHistory'>
  ): { customerId: string; isDuplicate: boolean } => {
    // Check duplicate
    const existing = findCustomerByContact(data.phone, data.email);
    if (existing) {
      // Update existing customer record with latest room/property details
      updateCustomer(existing.id, {
        propertyId: data.propertyId,
        propertyName: data.propertyName,
        roomId: data.roomId,
        roomName: data.roomName,
        roomType: data.roomType,
        bedId: data.bedId,
        bedNumber: data.bedNumber,
        moveInDate: data.moveInDate,
        expectedMoveOutDate: data.expectedMoveOutDate,
        monthlyRent: data.monthlyRent,
        securityDeposit: data.securityDeposit,
        tenantStatus: data.tenantStatus || 'Upcoming',
      });
      return { customerId: existing.id, isDuplicate: true };
    }

    const customerId = `cust-${Date.now()}`;
    const { date, time } = getFormattedNow();
    const newCustomer: CustomerItem = {
      ...data,
      id: customerId,
      createdAt: new Date().toISOString(),
      documents: [
        {
          id: `doc-${Date.now()}-1`,
          name: 'Identity Proof (Aadhaar / Passport)',
          type: 'govt_id',
          fileName: `kyc_${data.fullName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
          fileSize: '1.2 MB',
          uploadedAt: date,
          verificationStatus: 'verified',
        },
      ],
      paymentHistory: [
        {
          id: `pay-${Date.now()}`,
          paymentId: `PAY-NST-${Math.floor(100000 + Math.random() * 900000)}`,
          date,
          propertyId: data.propertyId,
          propertyName: data.propertyName,
          rentAmount: data.monthlyRent,
          additionalCharges: data.securityDeposit,
          totalAmount: data.monthlyRent + data.securityDeposit,
          paymentMethod: 'UPI',
          status: 'Completed',
          receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
          description: 'Initial Move-in Rent & Security Deposit Allotment',
        },
      ],
      visitHistory: [],
      timeline: [
        {
          id: `cact-${Date.now()}`,
          action: 'Customer Onboarded',
          description: `Resident account initialized for ${data.propertyName} (${data.roomName}).`,
          date,
          time,
          user: 'Nestin Automation',
          type: 'customer',
        },
      ],
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    addAuditLog('Customer Created', `New tenant customer record created for ${data.fullName}`, 'customer');
    return { customerId, isDuplicate: false };
  };

  const updateCustomer = (id: string, updates: Partial<CustomerItem>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return { ...c, ...updates };
      })
    );
  };

  const addCustomerDocument = (customerId: string, doc: Omit<CustomerDocumentItem, 'id' | 'uploadedAt'>) => {
    const { date, time } = getFormattedNow();
    const newDoc: CustomerDocumentItem = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedAt: date,
    };
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const act: CRMActivityLog = {
          id: `cact-doc-${Date.now()}`,
          action: 'Document Uploaded',
          description: `Uploaded document: ${doc.name} (${doc.fileName}).`,
          date,
          time,
          user: 'Paritala Venkata Vaibhav',
          type: 'document',
        };
        return {
          ...c,
          documents: [newDoc, ...c.documents],
          timeline: [act, ...c.timeline],
        };
      })
    );
    addAuditLog('Document Uploaded', `Document added for tenant ${customerId}`, 'document');
  };

  const verifyCustomerDocument = (customerId: string, docId: string, status: 'verified' | 'rejected') => {
    const { date, time } = getFormattedNow();
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const updatedDocs = c.documents.map((d) => (d.id === docId ? { ...d, verificationStatus: status } : d));
        const act: CRMActivityLog = {
          id: `cact-doc-ver-${Date.now()}`,
          action: status === 'verified' ? 'Document Verified' : 'Document Rejected',
          description: `Document status marked as ${status}.`,
          date,
          time,
          user: 'Paritala Venkata Vaibhav',
          type: 'document',
        };
        return {
          ...c,
          documents: updatedDocs,
          timeline: [act, ...c.timeline],
        };
      })
    );
    addAuditLog('Document Verification', `Document ${docId} ${status}`, 'document');
  };

  const addCustomerPayment = (customerId: string, payment: Omit<CustomerPaymentRecord, 'id' | 'receiptNumber'>) => {
    const { date, time } = getFormattedNow();
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    const newRecord: CustomerPaymentRecord = {
      ...payment,
      id: `pay-${Date.now()}`,
      receiptNumber,
    };
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const act: CRMActivityLog = {
          id: `cact-pay-${Date.now()}`,
          action: 'Payment Received',
          description: `Payment of ₹${payment.totalAmount.toLocaleString('en-IN')} received via ${payment.paymentMethod} (${receiptNumber}).`,
          date,
          time,
          user: 'Paritala Venkata Vaibhav',
          type: 'payment',
        };
        return {
          ...c,
          paymentStatus: 'Paid',
          paymentHistory: [newRecord, ...c.paymentHistory],
          timeline: [act, ...c.timeline],
        };
      })
    );
    addAuditLog('Payment Logged', `Received ₹${payment.totalAmount} from customer ${customerId}`, 'payment');
    addNotification({
      title: 'Payment Received',
      message: `Rent payment of ₹${payment.totalAmount} logged for receipt ${receiptNumber}.`,
      type: 'payment',
      linkTo: '/owner/customers',
    });
  };

  const recordCustomerMoveOut = (customerId: string, moveOutDate: string, reason?: string) => {
    const { date, time } = getFormattedNow();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    // Free bed
    if (customer.propertyId && customer.roomId && customer.bedId) {
      updateBedStatus(customer.propertyId, customer.roomId, customer.bedId, false, undefined);
    }

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const act: CRMActivityLog = {
          id: `cact-mo-${Date.now()}`,
          action: 'Move-out Completed',
          description: `Resident vacated on ${moveOutDate}. Reason: ${reason || 'End of lease tenure'}.`,
          date,
          time,
          user: 'Paritala Venkata Vaibhav',
          type: 'customer',
        };
        return {
          ...c,
          tenantStatus: 'Inactive',
          expectedMoveOutDate: moveOutDate,
          timeline: [act, ...c.timeline],
        };
      })
    );

    addAuditLog('Tenant Vacated', `Tenant ${customer.fullName} vacated bed ${customer.bedNumber}`, 'customer');
  };

  const deleteCustomer = (id: string) => {
    const target = customers.find((c) => c.id === id);
    if (target && target.propertyId && target.roomId && target.bedId) {
      updateBedStatus(target.propertyId, target.roomId, target.bedId, false, undefined);
    }
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (target) {
      addAuditLog('Customer Deleted', `Deleted customer record: ${target.fullName}`, 'customer');
    }
  };

  // ---------------------------------------------------------------------------
  // BOOKINGS METHODS & AUTOMATION
  // ---------------------------------------------------------------------------
  const getBookingById = (id: string): BookingItem | null => {
    return bookings.find((b) => b.id === id) || null;
  };

  const createBooking = (
    data: Omit<BookingItem, 'id' | 'bookingNumber' | 'createdAt' | 'timeline'>
  ): string => {
    const id = `bk-${Date.now()}`;
    const bookingNumber = `NST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { date, time } = getFormattedNow();

    const initialActivity: CRMActivityLog = {
      id: `bkact-${Date.now()}`,
      action: 'Booking Created',
      description: `New booking request ${bookingNumber} created for ${data.roomName} (${data.bedNumber}).`,
      date,
      time,
      user: 'Paritala Venkata Vaibhav',
      type: 'booking',
    };

    const newBooking: BookingItem = {
      ...data,
      id,
      bookingNumber,
      createdAt: new Date().toISOString(),
      timeline: [initialActivity],
    };

    setBookings((prev) => [newBooking, ...prev]);

    // If linked to lead, update lead status to 'Booking Requested'
    if (data.leadId) {
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== data.leadId) return l;
          const leadAct: CRMActivityLog = {
            id: `lact-bk-${Date.now()}`,
            action: 'Booking Requested',
            description: `Booking ${bookingNumber} generated for ${data.propertyName}.`,
            date,
            time,
            user: 'Paritala Venkata Vaibhav',
            type: 'booking',
          };
          return {
            ...l,
            stage: 'Booking Requested',
            bookingId: id,
            timeline: [leadAct, ...l.timeline],
          };
        })
      );
    }

    addAuditLog('Booking Created', `Booking ${bookingNumber} created for ${data.tenantName}`, 'booking');
    addNotification({
      title: 'Booking Created',
      message: `Booking ${bookingNumber} for ${data.tenantName} at ${data.propertyName}.`,
      type: 'booking',
      linkTo: '/owner/bookings',
    });

    return id;
  };

  const updateBooking = (id: string, updates: Partial<BookingItem>) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        return { ...b, ...updates };
      })
    );
  };

  // FULL AUTOMATION: Approve Booking
  const approveBooking = (bookingId: string): { success: boolean; customerId: string } => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return { success: false, customerId: '' };

    const { date, time } = getFormattedNow();

    // 1. Update Room Bed Status in Property Inventory
    if (booking.propertyId && booking.roomId && booking.bedId) {
      updateBedStatus(booking.propertyId, booking.roomId, booking.bedId, true, booking.tenantName);
    }

    // 2. Create or Link Customer with duplicate protection
    const { customerId } = createCustomer({
      fullName: booking.tenantName,
      phone: booking.tenantPhone,
      email: booking.tenantEmail,
      avatar: booking.tenantAvatar,
      propertyId: booking.propertyId,
      propertyName: booking.propertyName,
      propertyAddress: booking.propertyAddress,
      roomId: booking.roomId,
      roomName: booking.roomName,
      roomType: booking.roomType,
      bedId: booking.bedId,
      bedNumber: booking.bedNumber,
      moveInDate: booking.moveInDate,
      expectedMoveOutDate: booking.expectedMoveOutDate,
      monthlyRent: booking.monthlyRent,
      securityDeposit: booking.securityDeposit,
      paymentStatus: 'Paid',
      tenantStatus: 'Upcoming',
      notes: `Booking: ${booking.bookingNumber}. Approved on ${date}.`,
      leadId: booking.leadId,
      bookingId: booking.id,
    });

    // 3. Update Booking Record Status & Payment
    const approvalAct: CRMActivityLog = {
      id: `bkact-app-${Date.now()}`,
      action: 'Booking Approved',
      description: `Owner approved booking. Bed ${booking.bedNumber} reserved and customer profile linked.`,
      date,
      time,
      user: 'Paritala Venkata Vaibhav',
      type: 'booking',
    };

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;
        return {
          ...b,
          bookingStatus: 'Confirmed',
          paymentStatus: 'Paid',
          paidAmount: b.totalAmount,
          customerId,
          timeline: [approvalAct, ...b.timeline],
        };
      })
    );

    // 4. Update Lead Record if linked
    if (booking.leadId) {
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== booking.leadId) return l;
          const leadAct: CRMActivityLog = {
            id: `lact-conv-${Date.now()}`,
            action: 'Lead Converted',
            description: `Lead converted to confirmed tenant upon booking approval (${booking.bookingNumber}).`,
            date,
            time,
            user: 'Paritala Venkata Vaibhav',
            type: 'customer',
          };
          return {
            ...l,
            stage: 'Converted',
            customerId,
            timeline: [leadAct, ...l.timeline],
          };
        })
      );
    }

    // 5. Audit & Notification
    addAuditLog('Booking Approved', `Booking ${booking.bookingNumber} approved for ${booking.tenantName}`, 'booking');
    addNotification({
      title: 'Booking Approved',
      message: `Booking ${booking.bookingNumber} confirmed. Tenant allotment ready for ${booking.moveInDate}.`,
      type: 'booking',
      linkTo: '/owner/bookings',
    });

    return { success: true, customerId };
  };

  const rejectBooking = (bookingId: string, reason: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const { date, time } = getFormattedNow();
    const rejectAct: CRMActivityLog = {
      id: `bkact-rej-${Date.now()}`,
      action: 'Booking Rejected',
      description: `Booking rejected by owner. Reason: ${reason}`,
      date,
      time,
      user: 'Paritala Venkata Vaibhav',
      type: 'booking',
    };

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;
        return {
          ...b,
          bookingStatus: 'Rejected',
          rejectionReason: reason,
          timeline: [rejectAct, ...b.timeline],
        };
      })
    );

    addAuditLog('Booking Rejected', `Booking ${booking.bookingNumber} rejected: ${reason}`, 'booking');
  };

  const cancelBooking = (bookingId: string, reason: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const { date, time } = getFormattedNow();

    // Free bed if occupied
    if (booking.propertyId && booking.roomId && booking.bedId) {
      updateBedStatus(booking.propertyId, booking.roomId, booking.bedId, false, undefined);
    }

    const cancelAct: CRMActivityLog = {
      id: `bkact-can-${Date.now()}`,
      action: 'Booking Cancelled',
      description: `Booking cancelled. Reason: ${reason}. Bed ${booking.bedNumber} released.`,
      date,
      time,
      user: 'Paritala Venkata Vaibhav',
      type: 'booking',
    };

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;
        return {
          ...b,
          bookingStatus: 'Cancelled',
          cancellationReason: reason,
          timeline: [cancelAct, ...b.timeline],
        };
      })
    );

    addAuditLog('Booking Cancelled', `Booking ${booking.bookingNumber} cancelled`, 'booking');
  };

  const completeMoveIn = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const { date, time } = getFormattedNow();
    const moveInAct: CRMActivityLog = {
      id: `bkact-mi-${Date.now()}`,
      action: 'Move-in Completed',
      description: `Tenant moved in. Physical key & biometric verification completed.`,
      date,
      time,
      user: 'Paritala Venkata Vaibhav',
      type: 'customer',
    };

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;
        return {
          ...b,
          bookingStatus: 'Completed',
          timeline: [moveInAct, ...b.timeline],
        };
      })
    );

    if (booking.customerId) {
      updateCustomer(booking.customerId, { tenantStatus: 'Active' });
    }

    addAuditLog('Move-in Completed', `Tenant move-in verified for booking ${booking.bookingNumber}`, 'customer');
  };

  return (
    <CRMContext.Provider
      value={{
        leads,
        getLeadById,
        createLead,
        updateLead,
        updateLeadStage,
        deleteLead,
        addLeadNote,
        logLeadContact,
        importLeads,

        bookings,
        getBookingById,
        createBooking,
        updateBooking,
        approveBooking,
        rejectBooking,
        cancelBooking,
        completeMoveIn,

        visitors,
        getVisitorById,
        scheduleVisit,
        updateVisitor,
        updateVisitorStatus,
        deleteVisitor,

        customers,
        getCustomerById,
        findCustomerByContact,
        createCustomer,
        updateCustomer,
        addCustomerDocument,
        verifyCustomerDocument,
        addCustomerPayment,
        recordCustomerMoveOut,
        deleteCustomer,

        auditLogs,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        addNotification,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
