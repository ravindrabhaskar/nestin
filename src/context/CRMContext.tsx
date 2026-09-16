import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import {
  LeadItem,
  LeadStage,
  BookingItem,
  VisitorItem,
  VisitorStatus,
  CustomerItem,
  CRMActivityLog,
  OwnerCRMNotification,
  CustomerDocumentItem,
  CustomerPaymentRecord,
} from '../types/crm';
import { usePropertyListing } from './PropertyListingContext';
import { useAuth } from './AuthContext';
import { ApiClient } from '../lib/apiClient';
import { reportSyncError } from '../lib/syncBus';

/**
 * Owner CRM state. The public API is synchronous (components stay simple and optimistic); every
 * mutation is persisted to the API in the background and rolled back on failure. Cross-entity
 * workflows (booking approval, cancellations, move-outs) are executed by the server, which is the
 * source of truth for bed inventory, customers and payments.
 */
interface CRMContextType {
  isLoading: boolean;
  refresh: () => Promise<void>;

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
  createCustomer: (
    customer: Omit<CustomerItem, 'id' | 'createdAt' | 'timeline' | 'documents' | 'paymentHistory' | 'visitHistory'>
  ) => { customerId: string; isDuplicate: boolean };
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

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const getFormattedNow = () => {
  const d = new Date();
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
};

const replaceById = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isOwner, isEmployee, isSuperAdmin, isLoading: authLoading } = useAuth();
  const { refresh: refreshProperties } = usePropertyListing();

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<CRMActivityLog[]>([]);
  const [notifications, setNotifications] = useState<OwnerCRMNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Refs let synchronous mutators read the latest state without stale closures.
  const leadsRef = useRef(leads);
  const bookingsRef = useRef(bookings);
  const visitorsRef = useRef(visitors);
  const customersRef = useRef(customers);
  leadsRef.current = leads;
  bookingsRef.current = bookings;
  visitorsRef.current = visitors;
  customersRef.current = customers;

  const actorName = user?.name || 'Owner Portal';
  const canUseCrm = isOwner || isEmployee || isSuperAdmin;

  const refresh = useCallback(async () => {
    if (!canUseCrm) {
      setLeads([]);
      setBookings([]);
      setVisitors([]);
      setCustomers([]);
      setAuditLogs([]);
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    try {
      const snap = await ApiClient.crm.snapshot();
      setLeads(snap.leads || []);
      setBookings(snap.bookings || []);
      setVisitors(snap.visitors || []);
      setCustomers(snap.customers || []);
      setAuditLogs(snap.auditLogs || []);
      setNotifications(snap.notifications || []);
    } catch (err) {
      reportSyncError('Could not load CRM data', err);
    } finally {
      setIsLoading(false);
    }
  }, [canUseCrm]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh, user?.id]);

  // -------------------------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------------------------

  const addAuditLog = useCallback(
    (action: string, description: string, type: CRMActivityLog['type'], userLabel: string = actorName) => {
      const { date, time } = getFormattedNow();
      const newLog: CRMActivityLog = { id: uid('act'), action, description, date, time, user: userLabel, type };
      setAuditLogs((prev) => [newLog, ...prev]);
      ApiClient.crm.logActivity({ action, description, type }).catch(() => undefined);
      return newLog;
    },
    [actorName]
  );

  const addNotification = useCallback((notif: Omit<OwnerCRMNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const { date, time } = getFormattedNow();
    const local: OwnerCRMNotification = { ...notif, id: uid('ntf'), timestamp: `${date}, ${time}`, isRead: false };
    setNotifications((prev) => [local, ...prev]);
    ApiClient.crm
      .createNotification(notif)
      .then((saved) => setNotifications((prev) => prev.map((n) => (n.id === local.id ? saved : n))))
      .catch(() => undefined);
  }, []);

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    ApiClient.crm.markNotificationRead(id).catch(() => undefined);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    ApiClient.crm.markNotificationRead('all').catch(() => undefined);
  };

  /** Persists a full lead/visitor/customer document; restores the previous version on failure. */
  const persist = <T extends { id: string }>(
    kind: 'leads' | 'visitors' | 'customers',
    doc: T,
    previous: T | null,
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    label: string
  ) => {
    ApiClient.crm
      .upsert(kind, doc as unknown as { id?: string } & Record<string, unknown>)
      .then((saved: T) => setter((prev) => replaceById(prev, saved)))
      .catch((err) => {
        setter((prev) => (previous ? replaceById(prev, previous) : prev.filter((x) => x.id !== doc.id)));
        reportSyncError(label, err);
      });
  };

  const applyWorkflowResult = (result: {
    booking?: BookingItem;
    customer?: CustomerItem;
    lead?: LeadItem | null;
    property?: unknown;
  }) => {
    if (result.booking) setBookings((prev) => replaceById(prev, result.booking!));
    if (result.customer) setCustomers((prev) => replaceById(prev, result.customer!));
    if (result.lead) setLeads((prev) => replaceById(prev, result.lead!));
    if (result.property) void refreshProperties();
  };

  // -------------------------------------------------------------------------------------------
  // Leads
  // -------------------------------------------------------------------------------------------

  const getLeadById = (id: string) => leadsRef.current.find((l) => l.id === id) || null;

  const mutateLead = (id: string, mutator: (lead: LeadItem) => LeadItem, label: string) => {
    const current = leadsRef.current.find((l) => l.id === id);
    if (!current) return;
    const updated = mutator(current);
    setLeads((prev) => replaceById(prev, updated));
    persist('leads', updated, current, setLeads, label);
  };

  const createLead = (data: Omit<LeadItem, 'id' | 'createdAt' | 'timeline'>): string => {
    const id = uid('lead');
    const { date, time } = getFormattedNow();
    const newLead: LeadItem = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      timeline: [
        {
          id: uid('lact'),
          action: 'Lead Created',
          description: `New lead created from ${data.source} for ${data.propertyName || 'Property'}.`,
          date,
          time,
          user: actorName,
          type: 'lead',
        },
      ],
    };
    setLeads((prev) => [newLead, ...prev]);
    persist('leads', newLead, null, setLeads, 'Could not save the lead');
    addAuditLog('Lead Created', `Added new lead: ${data.fullName} (${data.phone})`, 'lead');
    addNotification({
      title: 'New Lead Added',
      message: `${data.fullName} registered interest for ${data.propertyName}.`,
      type: 'lead',
      linkTo: '/owner/leads',
    });
    return id;
  };

  const updateLead = (id: string, updates: Partial<LeadItem>) =>
    mutateLead(id, (l) => ({ ...l, ...updates }), 'Could not update the lead');

  const updateLeadStage = (id: string, stage: LeadStage, note?: string) => {
    const { date, time } = getFormattedNow();
    mutateLead(
      id,
      (l) => ({
        ...l,
        stage,
        lastContactDate: new Date().toISOString().split('T')[0],
        timeline: [
          {
            id: uid('lact'),
            action: 'Stage Changed',
            description: `Stage moved from "${l.stage}" to "${stage}". ${note ? `Note: ${note}` : ''}`,
            date,
            time,
            user: actorName,
            type: 'lead',
          },
          ...l.timeline,
        ],
      }),
      'Could not update the lead stage'
    );
    addAuditLog('Lead Stage Updated', `Lead stage changed to ${stage}`, 'lead');
  };

  const deleteLead = (id: string) => {
    const target = leadsRef.current.find((l) => l.id === id);
    if (!target) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    ApiClient.crm.remove('leads', id).catch((err) => {
      setLeads((prev) => [target, ...prev]);
      reportSyncError('Could not delete the lead', err);
    });
    addAuditLog('Lead Deleted', `Deleted lead record: ${target.fullName}`, 'lead');
  };

  const addLeadNote = (id: string, noteText: string) => {
    const { date, time } = getFormattedNow();
    mutateLead(
      id,
      (l) => ({
        ...l,
        notes: l.notes ? `${l.notes}\n[${date}]: ${noteText}` : noteText,
        timeline: [
          { id: uid('lact'), action: 'Note Added', description: noteText, date, time, user: actorName, type: 'lead' },
          ...l.timeline,
        ],
      }),
      'Could not save the note'
    );
  };

  const logLeadContact = (id: string, method: 'call' | 'whatsapp' | 'email', notes?: string) => {
    const { date, time } = getFormattedNow();
    const actionLabel = method === 'call' ? 'Call Made' : method === 'whatsapp' ? 'WhatsApp Sent' : 'Email Sent';
    mutateLead(
      id,
      (l) => ({
        ...l,
        stage: l.stage === 'New' ? 'Contacted' : l.stage,
        lastContactDate: new Date().toISOString().split('T')[0],
        timeline: [
          {
            id: uid('lact'),
            action: actionLabel,
            description: notes || `${actionLabel} to prospect ${l.fullName} (${l.phone}).`,
            date,
            time,
            user: actorName,
            type: 'lead',
          },
          ...l.timeline,
        ],
      }),
      'Could not log the contact'
    );
    const lead = leadsRef.current.find((l) => l.id === id);
    addAuditLog(actionLabel, `Contacted ${lead?.fullName || id} via ${method}`, 'lead');
  };

  const importLeads = (newLeadsData: Array<Omit<LeadItem, 'id' | 'createdAt' | 'timeline'>>): number => {
    const { date, time } = getFormattedNow();
    const created: LeadItem[] = newLeadsData.map((d) => ({
      ...d,
      id: uid('lead'),
      createdAt: new Date().toISOString(),
      timeline: [
        {
          id: uid('lact'),
          action: 'Lead Imported',
          description: `Batch CSV import from ${d.source}.`,
          date,
          time,
          user: 'CSV Bulk Importer',
          type: 'lead',
        },
      ],
    }));
    setLeads((prev) => [...created, ...prev]);
    for (const lead of created) persist('leads', lead, null, setLeads, `Could not import lead ${lead.fullName}`);
    addAuditLog('Bulk Leads Imported', `Imported ${created.length} new leads via CSV`, 'lead');
    return created.length;
  };

  // -------------------------------------------------------------------------------------------
  // Visitors
  // -------------------------------------------------------------------------------------------

  const getVisitorById = (id: string) => visitorsRef.current.find((v) => v.id === id) || null;

  const mutateVisitor = (id: string, mutator: (v: VisitorItem) => VisitorItem, label: string) => {
    const current = visitorsRef.current.find((v) => v.id === id);
    if (!current) return;
    const updated = mutator(current);
    setVisitors((prev) => replaceById(prev, updated));
    persist('visitors', updated, current, setVisitors, label);
  };

  const scheduleVisit = (data: Omit<VisitorItem, 'id' | 'createdAt' | 'timeline'>): string => {
    const id = uid('vis');
    const { date, time } = getFormattedNow();
    const newVisitor: VisitorItem = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      timeline: [
        {
          id: uid('vact'),
          action: 'Visit Scheduled',
          description: `Visit scheduled for ${data.visitDate} at ${data.visitTime} (${data.numberOfVisitors} visitor(s)).`,
          date,
          time,
          user: actorName,
          type: 'visit',
        },
      ],
    };
    setVisitors((prev) => [newVisitor, ...prev]);
    persist('visitors', newVisitor, null, setVisitors, 'Could not schedule the visit');

    if (data.leadId) {
      mutateLead(
        data.leadId,
        (l) => ({
          ...l,
          stage: 'Visit Scheduled',
          visitorId: id,
          timeline: [
            {
              id: uid('lact'),
              action: 'Visit Scheduled',
              description: `Walkthrough booked for ${data.visitDate} at ${data.visitTime} at ${data.propertyName}.`,
              date,
              time,
              user: actorName,
              type: 'visit',
            },
            ...l.timeline,
          ],
        }),
        'Could not link the visit to the lead'
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

  const updateVisitor = (id: string, updates: Partial<VisitorItem>) =>
    mutateVisitor(id, (v) => ({ ...v, ...updates }), 'Could not update the visit');

  const updateVisitorStatus = (id: string, status: VisitorStatus, note?: string) => {
    const { date, time } = getFormattedNow();
    const visitor = visitorsRef.current.find((v) => v.id === id);
    mutateVisitor(
      id,
      (v) => ({
        ...v,
        status,
        timeline: [
          {
            id: uid('vact'),
            action: `Status Updated to ${status}`,
            description: note || `Visit status updated to ${status}.`,
            date,
            time,
            user: actorName,
            type: 'visit',
          },
          ...v.timeline,
        ],
      }),
      'Could not update the visit status'
    );
    if (status === 'Completed' && visitor?.leadId)
      updateLeadStage(visitor.leadId, 'Visited', 'Walkthrough completed by visitor.');
    addAuditLog('Visit Status Updated', `Visitor ${visitor?.visitorName || id} status set to ${status}`, 'visit');
  };

  const deleteVisitor = (id: string) => {
    const target = visitorsRef.current.find((v) => v.id === id);
    if (!target) return;
    setVisitors((prev) => prev.filter((v) => v.id !== id));
    ApiClient.crm.remove('visitors', id).catch((err) => {
      setVisitors((prev) => [target, ...prev]);
      reportSyncError('Could not delete the visit', err);
    });
    addAuditLog('Visit Deleted', `Cancelled and removed visit for ${target.visitorName}`, 'visit');
  };

  // -------------------------------------------------------------------------------------------
  // Customers
  // -------------------------------------------------------------------------------------------

  const getCustomerById = (id: string) => customersRef.current.find((c) => c.id === id) || null;

  const findCustomerByContact = (phone: string, email?: string): CustomerItem | null => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    return (
      customersRef.current.find((c) => {
        const cPhone = c.phone.replace(/\D/g, '').slice(-10);
        if (cleanPhone && cPhone && cleanPhone === cPhone) return true;
        if (email && c.email && c.email.toLowerCase() === email.toLowerCase().trim()) return true;
        return false;
      }) || null
    );
  };

  const mutateCustomer = (id: string, mutator: (c: CustomerItem) => CustomerItem, label: string) => {
    const current = customersRef.current.find((c) => c.id === id);
    if (!current) return;
    const updated = mutator(current);
    setCustomers((prev) => replaceById(prev, updated));
    persist('customers', updated, current, setCustomers, label);
  };

  const createCustomer = (
    data: Omit<CustomerItem, 'id' | 'createdAt' | 'timeline' | 'documents' | 'paymentHistory' | 'visitHistory'>
  ) => {
    const existing = findCustomerByContact(data.phone, data.email);
    if (existing) {
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
    const customerId = uid('cust');
    const { date, time } = getFormattedNow();
    const newCustomer: CustomerItem = {
      ...data,
      id: customerId,
      createdAt: new Date().toISOString(),
      documents: [],
      paymentHistory: [],
      visitHistory: [],
      timeline: [
        {
          id: uid('cact'),
          action: 'Customer Onboarded',
          description: `Resident account initialized for ${data.propertyName} (${data.roomName}).`,
          date,
          time,
          user: actorName,
          type: 'customer',
        },
      ],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    persist('customers', newCustomer, null, setCustomers, 'Could not create the customer');
    addAuditLog('Customer Created', `New tenant customer record created for ${data.fullName}`, 'customer');
    return { customerId, isDuplicate: false };
  };

  const updateCustomer = (id: string, updates: Partial<CustomerItem>) =>
    mutateCustomer(id, (c) => ({ ...c, ...updates }), 'Could not update the customer');

  const addCustomerDocument = (customerId: string, doc: Omit<CustomerDocumentItem, 'id' | 'uploadedAt'>) => {
    const { date, time } = getFormattedNow();
    mutateCustomer(
      customerId,
      (c) => ({
        ...c,
        documents: [{ ...doc, id: uid('doc'), uploadedAt: date }, ...c.documents],
        timeline: [
          {
            id: uid('cact'),
            action: 'Document Uploaded',
            description: `Uploaded document: ${doc.name} (${doc.fileName}).`,
            date,
            time,
            user: actorName,
            type: 'document',
          },
          ...c.timeline,
        ],
      }),
      'Could not add the document'
    );
    addAuditLog('Document Uploaded', `Document added for customer ${customerId}`, 'document');
  };

  const verifyCustomerDocument = (customerId: string, docId: string, status: 'verified' | 'rejected') => {
    const { date, time } = getFormattedNow();
    mutateCustomer(
      customerId,
      (c) => ({
        ...c,
        documents: c.documents.map((d) => (d.id === docId ? { ...d, verificationStatus: status } : d)),
        timeline: [
          {
            id: uid('cact'),
            action: status === 'verified' ? 'Document Verified' : 'Document Rejected',
            description: `Document status marked as ${status}.`,
            date,
            time,
            user: actorName,
            type: 'document',
          },
          ...c.timeline,
        ],
      }),
      'Could not update the document status'
    );
    addAuditLog('Document Verification', `Document ${docId} ${status}`, 'document');
  };

  const addCustomerPayment = (customerId: string, payment: Omit<CustomerPaymentRecord, 'id' | 'receiptNumber'>) => {
    const current = customersRef.current.find((c) => c.id === customerId);
    if (!current) return;
    const { date, time } = getFormattedNow();
    const optimistic: CustomerItem = {
      ...current,
      paymentStatus: 'Paid',
      paymentHistory: [{ ...payment, id: uid('pay'), receiptNumber: 'Pending…' }, ...current.paymentHistory],
      timeline: [
        {
          id: uid('cact'),
          action: 'Payment Received',
          description: `Payment of ₹${payment.totalAmount.toLocaleString('en-IN')} received via ${payment.paymentMethod}.`,
          date,
          time,
          user: actorName,
          type: 'payment',
        },
        ...current.timeline,
      ],
    };
    setCustomers((prev) => replaceById(prev, optimistic));
    ApiClient.crm
      .addCustomerPayment(customerId, payment as unknown as Record<string, unknown>)
      .then((saved: CustomerItem) => setCustomers((prev) => replaceById(prev, saved)))
      .catch((err) => {
        setCustomers((prev) => replaceById(prev, current));
        reportSyncError('Could not record the payment', err);
      });
    addAuditLog('Payment Logged', `Received ₹${payment.totalAmount} from ${current.fullName}`, 'payment');
    addNotification({
      title: 'Payment Received',
      message: `Rent payment of ₹${payment.totalAmount} logged for ${current.fullName}.`,
      type: 'payment',
      linkTo: '/owner/customers',
    });
  };

  const recordCustomerMoveOut = (customerId: string, moveOutDate: string, reason?: string) => {
    const current = customersRef.current.find((c) => c.id === customerId);
    if (!current) return;
    const { date, time } = getFormattedNow();
    setCustomers((prev) =>
      replaceById(prev, {
        ...current,
        tenantStatus: 'Inactive',
        expectedMoveOutDate: moveOutDate,
        timeline: [
          {
            id: uid('cact'),
            action: 'Move-out Completed',
            description: `Resident vacated on ${moveOutDate}. Reason: ${reason || 'End of lease tenure'}.`,
            date,
            time,
            user: actorName,
            type: 'customer',
          },
          ...current.timeline,
        ],
      })
    );
    ApiClient.crm
      .moveOut(customerId, { moveOutDate, reason })
      .then(applyWorkflowResult)
      .catch((err) => {
        setCustomers((prev) => replaceById(prev, current));
        reportSyncError('Could not record the move-out', err);
      });
    addAuditLog('Tenant Vacated', `Tenant ${current.fullName} vacated bed ${current.bedNumber}`, 'customer');
  };

  const deleteCustomer = (id: string) => {
    const target = customersRef.current.find((c) => c.id === id);
    if (!target) return;
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    ApiClient.crm
      .remove('customers', id)
      .then(() => refreshProperties())
      .catch((err) => {
        setCustomers((prev) => [target, ...prev]);
        reportSyncError('Could not delete the customer', err);
      });
    addAuditLog('Customer Deleted', `Deleted customer record: ${target.fullName}`, 'customer');
  };

  // -------------------------------------------------------------------------------------------
  // Bookings (server-authoritative workflows)
  // -------------------------------------------------------------------------------------------

  const getBookingById = (id: string) => bookingsRef.current.find((b) => b.id === id) || null;

  const createBooking = (data: Omit<BookingItem, 'id' | 'bookingNumber' | 'createdAt' | 'timeline'>): string => {
    const id = uid('bk');
    const { date, time } = getFormattedNow();
    const optimistic: BookingItem = {
      ...data,
      id,
      bookingNumber: 'Pending…',
      bookingStatus: 'Pending',
      createdAt: new Date().toISOString(),
      timeline: [
        {
          id: uid('bkact'),
          action: 'Booking Created',
          description: `New booking request created for ${data.roomName} (${data.bedNumber}).`,
          date,
          time,
          user: actorName,
          type: 'booking',
        },
      ],
    };
    setBookings((prev) => [optimistic, ...prev]);
    ApiClient.crm
      .createBooking({ ...data, id })
      .then((saved: BookingItem) => {
        setBookings((prev) => prev.map((b) => (b.id === id ? saved : b)));
        if (data.leadId) {
          const lead = leadsRef.current.find((l) => l.id === data.leadId);
          if (lead) setLeads((prev) => replaceById(prev, { ...lead, stage: 'Booking Requested', bookingId: saved.id }));
        }
        addNotification({
          title: 'Booking Created',
          message: `Booking ${saved.bookingNumber} for ${data.tenantName} at ${data.propertyName}.`,
          type: 'booking',
          linkTo: '/owner/bookings',
        });
      })
      .catch((err) => {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        reportSyncError('Could not create the booking', err);
      });
    addAuditLog('Booking Created', `Booking created for ${data.tenantName}`, 'booking');
    return id;
  };

  const updateBooking = (id: string, updates: Partial<BookingItem>) => {
    const current = bookingsRef.current.find((b) => b.id === id);
    if (!current) return;
    setBookings((prev) => replaceById(prev, { ...current, ...updates }));
    ApiClient.crm
      .updateBooking(id, updates as Record<string, unknown>)
      .then((saved: BookingItem) => setBookings((prev) => replaceById(prev, saved)))
      .catch((err) => {
        setBookings((prev) => replaceById(prev, current));
        reportSyncError('Could not update the booking', err);
      });
  };

  const approveBooking = (bookingId: string): { success: boolean; customerId: string } => {
    const booking = bookingsRef.current.find((b) => b.id === bookingId);
    if (!booking || booking.bookingStatus !== 'Pending') return { success: false, customerId: '' };
    const existing = findCustomerByContact(booking.tenantPhone, booking.tenantEmail);
    const customerId = existing?.id || uid('cust');
    const { date, time } = getFormattedNow();

    // Optimistic status flip; the server performs bed allocation, customer creation and payment.
    setBookings((prev) =>
      replaceById(prev, {
        ...booking,
        bookingStatus: 'Confirmed',
        paymentStatus: 'Paid',
        paidAmount: booking.totalAmount,
        customerId,
        timeline: [
          {
            id: uid('bkact'),
            action: 'Booking Approved',
            description: `Owner approved booking. Bed ${booking.bedNumber} reserved and customer profile linked.`,
            date,
            time,
            user: actorName,
            type: 'booking',
          },
          ...booking.timeline,
        ],
      })
    );
    ApiClient.crm
      .approveBooking(bookingId, { customerId })
      .then((result) => {
        applyWorkflowResult(result);
        addNotification({
          title: 'Booking Approved',
          message: `Booking ${booking.bookingNumber} confirmed. Tenant allotment ready for ${booking.moveInDate}.`,
          type: 'booking',
          linkTo: '/owner/bookings',
        });
      })
      .catch((err) => {
        setBookings((prev) => replaceById(prev, booking));
        reportSyncError('Could not approve the booking', err);
      });
    addAuditLog('Booking Approved', `Booking ${booking.bookingNumber} approved for ${booking.tenantName}`, 'booking');
    return { success: true, customerId };
  };

  const rejectBooking = (bookingId: string, reason: string) => {
    const booking = bookingsRef.current.find((b) => b.id === bookingId);
    if (!booking) return;
    const { date, time } = getFormattedNow();
    setBookings((prev) =>
      replaceById(prev, {
        ...booking,
        bookingStatus: 'Rejected',
        rejectionReason: reason,
        timeline: [
          {
            id: uid('bkact'),
            action: 'Booking Rejected',
            description: `Booking rejected by owner. Reason: ${reason}`,
            date,
            time,
            user: actorName,
            type: 'booking',
          },
          ...booking.timeline,
        ],
      })
    );
    ApiClient.crm
      .rejectBooking(bookingId, reason)
      .then((saved: BookingItem) => setBookings((prev) => replaceById(prev, saved)))
      .catch((err) => {
        setBookings((prev) => replaceById(prev, booking));
        reportSyncError('Could not reject the booking', err);
      });
    addAuditLog('Booking Rejected', `Booking ${booking.bookingNumber} rejected: ${reason}`, 'booking');
  };

  const cancelBooking = (bookingId: string, reason: string) => {
    const booking = bookingsRef.current.find((b) => b.id === bookingId);
    if (!booking) return;
    const { date, time } = getFormattedNow();
    setBookings((prev) =>
      replaceById(prev, {
        ...booking,
        bookingStatus: 'Cancelled',
        cancellationReason: reason,
        timeline: [
          {
            id: uid('bkact'),
            action: 'Booking Cancelled',
            description: `Booking cancelled. Reason: ${reason}. Bed ${booking.bedNumber} released.`,
            date,
            time,
            user: actorName,
            type: 'booking',
          },
          ...booking.timeline,
        ],
      })
    );
    ApiClient.crm
      .cancelBooking(bookingId, reason)
      .then(applyWorkflowResult)
      .catch((err) => {
        setBookings((prev) => replaceById(prev, booking));
        reportSyncError('Could not cancel the booking', err);
      });
    addAuditLog('Booking Cancelled', `Booking ${booking.bookingNumber} cancelled`, 'booking');
  };

  const completeMoveIn = (bookingId: string) => {
    const booking = bookingsRef.current.find((b) => b.id === bookingId);
    if (!booking) return;
    const { date, time } = getFormattedNow();
    setBookings((prev) =>
      replaceById(prev, {
        ...booking,
        bookingStatus: 'Completed',
        timeline: [
          {
            id: uid('bkact'),
            action: 'Move-in Completed',
            description: 'Tenant moved in. Physical key & biometric verification completed.',
            date,
            time,
            user: actorName,
            type: 'customer',
          },
          ...booking.timeline,
        ],
      })
    );
    if (booking.customerId) {
      const customer = customersRef.current.find((c) => c.id === booking.customerId);
      if (customer) setCustomers((prev) => replaceById(prev, { ...customer, tenantStatus: 'Active' }));
    }
    ApiClient.crm
      .completeMoveIn(bookingId)
      .then(applyWorkflowResult)
      .catch((err) => {
        setBookings((prev) => replaceById(prev, booking));
        reportSyncError('Could not complete the move-in', err);
      });
    addAuditLog('Move-in Completed', `Tenant move-in verified for booking ${booking.bookingNumber}`, 'customer');
  };

  const value = useMemo<CRMContextType>(
    () => ({
      isLoading,
      refresh,
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
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoading, refresh, leads, bookings, visitors, customers, auditLogs, notifications, actorName]
  );

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
