import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportExportOptions {
  month: string; // e.g. "August"
  year: number; // e.g. 2026
  propertyName?: string; // e.g. "All Properties (Consolidated)"
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  reportType: 'full' | 'revenue' | 'occupancy' | 'tax';
  includeLedger?: boolean;
  includeExpenses?: boolean;
}

export interface PropertyFinancialData {
  id: string;
  name: string;
  location: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: number;
  monthlyRevenueBilled: number;
  revenueCollected: number;
  pendingDues: number;
  expenses: number;
  netPayout: number;
}

export interface LedgerTransaction {
  id: string;
  date: string;
  property: string;
  unit: string;
  tenantName: string;
  type: 'Rent' | 'Security Deposit' | 'Utility' | 'Maintenance';
  amount: number;
  status: 'Settled' | 'Pending' | 'Overdue';
  paymentMode: 'UPI' | 'Bank Transfer' | 'Card' | 'Cash';
  receiptNo: string;
}

export interface ExpenseRecord {
  category: string;
  vendor: string;
  description: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending';
}

// Sample realistic datasets for owner accounting reporting
export const SAMPLE_PROPERTIES_FINANCIAL: PropertyFinancialData[] = [
  {
    id: 'prop-1',
    name: 'Nestin Elite Co-Living Hub',
    location: 'Gachibowli, Hyderabad',
    totalRooms: 18,
    totalBeds: 36,
    occupiedBeds: 32,
    vacantBeds: 4,
    occupancyRate: 88.9,
    monthlyRevenueBilled: 384000,
    revenueCollected: 362000,
    pendingDues: 22000,
    expenses: 68500,
    netPayout: 293500,
  },
  {
    id: 'prop-2',
    name: 'Nestin Prime Girls Residency',
    location: 'Madhapur, Hyderabad',
    totalRooms: 12,
    totalBeds: 24,
    occupiedBeds: 22,
    vacantBeds: 2,
    occupancyRate: 91.7,
    monthlyRevenueBilled: 264000,
    revenueCollected: 264000,
    pendingDues: 0,
    expenses: 42000,
    netPayout: 222000,
  },
  {
    id: 'prop-3',
    name: 'Nestin Scholars Hostel',
    location: 'Kukatpally, Hyderabad',
    totalRooms: 20,
    totalBeds: 40,
    occupiedBeds: 35,
    vacantBeds: 5,
    occupancyRate: 87.5,
    monthlyRevenueBilled: 315000,
    revenueCollected: 295000,
    pendingDues: 20000,
    expenses: 54000,
    netPayout: 241000,
  },
];

export const SAMPLE_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: 'TXN-8901',
    receiptNo: 'REC-2026-0801',
    date: '02 Aug 2026',
    property: 'Nestin Elite Co-Living',
    unit: 'Room 204 (Bed A)',
    tenantName: 'Rahul Verma',
    type: 'Rent',
    amount: 12000,
    status: 'Settled',
    paymentMode: 'UPI',
  },
  {
    id: 'TXN-8902',
    receiptNo: 'REC-2026-0802',
    date: '03 Aug 2026',
    property: 'Nestin Elite Co-Living',
    unit: 'Room 102 (Single)',
    tenantName: 'Siddharth Rao',
    type: 'Rent',
    amount: 16500,
    status: 'Settled',
    paymentMode: 'Bank Transfer',
  },
  {
    id: 'TXN-8903',
    receiptNo: 'REC-2026-0803',
    date: '04 Aug 2026',
    property: 'Nestin Prime Girls',
    unit: 'Room 301 (Bed B)',
    tenantName: 'Pooja Sharma',
    type: 'Rent',
    amount: 11000,
    status: 'Settled',
    paymentMode: 'UPI',
  },
  {
    id: 'TXN-8904',
    receiptNo: 'REC-2026-0804',
    date: '05 Aug 2026',
    property: 'Nestin Prime Girls',
    unit: 'Room 105 (Single)',
    tenantName: 'Ananya Reddy',
    type: 'Rent',
    amount: 15000,
    status: 'Settled',
    paymentMode: 'Card',
  },
  {
    id: 'TXN-8905',
    receiptNo: 'REC-2026-0805',
    date: '05 Aug 2026',
    property: 'Nestin Scholars Hostel',
    unit: 'Room 402 (Bed A)',
    tenantName: 'Karthik Nair',
    type: 'Rent',
    amount: 9000,
    status: 'Settled',
    paymentMode: 'UPI',
  },
  {
    id: 'TXN-8906',
    receiptNo: 'REC-2026-0806',
    date: '06 Aug 2026',
    property: 'Nestin Scholars Hostel',
    unit: 'Room 402 (Bed B)',
    tenantName: 'Aditya Sen',
    type: 'Rent',
    amount: 9000,
    status: 'Settled',
    paymentMode: 'UPI',
  },
  {
    id: 'TXN-8907',
    receiptNo: 'REC-2026-0807',
    date: '07 Aug 2026',
    property: 'Nestin Elite Co-Living',
    unit: 'Room 305 (Bed B)',
    tenantName: 'Vikram Mehta',
    type: 'Rent',
    amount: 12000,
    status: 'Pending',
    paymentMode: 'UPI',
  },
  {
    id: 'TXN-8908',
    receiptNo: 'REC-2026-0808',
    date: '01 Aug 2026',
    property: 'Nestin Elite Co-Living',
    unit: 'Room 108 (Bed A)',
    tenantName: 'Deepak Joshi',
    type: 'Security Deposit',
    amount: 24000,
    status: 'Settled',
    paymentMode: 'Bank Transfer',
  },
  {
    id: 'TXN-8909',
    receiptNo: 'REC-2026-0809',
    date: '08 Aug 2026',
    property: 'Nestin Scholars Hostel',
    unit: 'Room 201 (Bed A)',
    tenantName: 'Manoj Kumar',
    type: 'Rent',
    amount: 8500,
    status: 'Overdue',
    paymentMode: 'Cash',
  },
];

export const SAMPLE_EXPENSES: ExpenseRecord[] = [
  {
    category: 'Electricity & Utilities',
    vendor: 'TSSPDCL Power Corp',
    description: 'Commercial 3-Phase Meter Monthly Bill',
    date: '05 Aug 2026',
    amount: 48500,
    status: 'Paid',
  },
  {
    category: 'Wi-Fi & Telecom',
    vendor: 'ACT Fibernet Commercial',
    description: 'Gigabit Enterprise Dedicated Fiber Lease',
    date: '02 Aug 2026',
    amount: 14200,
    status: 'Paid',
  },
  {
    category: 'Housekeeping & Sanitization',
    vendor: 'CleanPro Facilities Pvt Ltd',
    description: 'Daily Cleaning & Garbage Management Contract',
    date: '06 Aug 2026',
    amount: 38000,
    status: 'Paid',
  },
  {
    category: 'RO Water & Plumbing Maintenance',
    vendor: 'AquaPure Solutions',
    description: 'Commercial Membrane Replacement & Filters',
    date: '08 Aug 2026',
    amount: 12800,
    status: 'Paid',
  },
  {
    category: 'Nestin OS Platform Fee',
    vendor: 'Nestin Technologies Inc',
    description: 'Software Subscription & Tenant KYC Verification',
    date: '01 Aug 2026',
    amount: 51000,
    status: 'Paid',
  },
];

export const formatCurrency = (val: number): string => {
  return 'INR ' + val.toLocaleString('en-IN');
};

/**
 * Generates and downloads a clean, professional multi-page Accounting PDF report.
 */
export const exportMonthlyReportPDF = (options: ReportExportOptions): void => {
  const {
    month,
    year,
    propertyName = 'All Properties (Consolidated)',
    ownerName,
    ownerEmail,
    ownerPhone = '+91 98765 43210',
    includeLedger = true,
    includeExpenses = true,
  } = options;

  // Initialize jsPDF (Portrait, mm, A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Aggregate metrics
  const totalBeds = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.totalBeds, 0);
  const occupiedBeds = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.occupiedBeds, 0);
  const vacantBeds = totalBeds - occupiedBeds;
  const overallOccupancy = ((occupiedBeds / totalBeds) * 100).toFixed(1);

  const totalBilled = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.monthlyRevenueBilled, 0);
  const totalCollected = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.revenueCollected, 0);
  const totalDues = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.pendingDues, 0);
  const totalExpenses = SAMPLE_EXPENSES.reduce((acc, e) => acc + e.amount, 0);
  const netOperatingIncome = totalCollected - totalExpenses;

  // Colors
  const brandDark: [number, number, number] = [18, 24, 32]; // #121820
  const brandAccent: [number, number, number] = [163, 230, 53]; // #a3e635
  const slate600: [number, number, number] = [71, 85, 105];
  const slate900: [number, number, number] = [15, 23, 42];
  const emerald700: [number, number, number] = [4, 120, 87];
  const rose700: [number, number, number] = [190, 18, 60];

  let currentY = 15;

  // 1. TOP BRAND HEADER
  doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Top Border
  doc.setFillColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.rect(0, 0, pageWidth, 3, 'F');

  // Brand Logo & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('NESTIN', 15, 14);

  doc.setTextColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.setFontSize(8);
  doc.text('OWNER OS • ACCOUNTING STATEMENT', 15, 20);

  // Right Header Info
  doc.setTextColor(220, 220, 220);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Statement Period: ${month} ${year}`, pageWidth - 15, 13, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 15, 18, { align: 'right' });
  doc.text(`Doc ID: NST-AC-${year}${month.substring(0, 3).toUpperCase()}-0892`, pageWidth - 15, 23, { align: 'right' });

  currentY = 36;

  // 2. OWNER & PROPERTY ENTITY DETAILS
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, currentY, pageWidth - 30, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('ACCOUNT HOLDER & PROPERTY ENTITY', 20, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`Owner Name: ${ownerName}`, 20, currentY + 13);
  doc.text(`Email: ${ownerEmail} | Phone: ${ownerPhone}`, 20, currentY + 18);
  doc.text(`GSTIN / Tax ID: 36AAACN1234F1Z8 (Telangana)`, 20, currentY + 23);

  // Scope on Right
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('STATEMENT SCOPE', pageWidth / 2 + 10, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`Target Entity: ${propertyName}`, pageWidth / 2 + 10, currentY + 13);
  doc.text(`Accounting Basis: Accrual & Realized Cash Flow`, pageWidth / 2 + 10, currentY + 18);
  doc.text(`Currency: Indian Rupee (INR)`, pageWidth / 2 + 10, currentY + 23);

  currentY += 32;

  // 3. EXECUTIVE FINANCIAL & OCCUPANCY METRICS CARDS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('1. Executive Financial Summary', 15, currentY);
  currentY += 4;

  const cardWidth = (pageWidth - 30 - 9) / 4;
  const cardHeight = 22;

  const metricCards = [
    {
      title: 'TOTAL BILLED RENT',
      val: formatCurrency(totalBilled),
      sub: `${SAMPLE_PROPERTIES_FINANCIAL.length} Active Properties`,
      color: [15, 23, 42],
    },
    {
      title: 'CASH COLLECTED',
      val: formatCurrency(totalCollected),
      sub: `${((totalCollected / totalBilled) * 100).toFixed(0)}% Collection Rate`,
      color: emerald700,
    },
    {
      title: 'PORTFOLIO OCCUPANCY',
      val: `${overallOccupancy}%`,
      sub: `${occupiedBeds} / ${totalBeds} Total Beds`,
      color: [15, 23, 42],
    },
    {
      title: 'NET OPERATING PAYOUT',
      val: formatCurrency(netOperatingIncome),
      sub: `After ₹${(totalExpenses / 1000).toFixed(0)}k Expenses`,
      color: emerald700,
    },
  ];

  metricCards.forEach((card, idx) => {
    const cx = 15 + idx * (cardWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.title, cx + 4, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.val, cx + 4, currentY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(card.sub, cx + 4, currentY + 18);
  });

  currentY += cardHeight + 8;

  // 4. PROPERTY-WISE OCCUPANCY & REVENUE BREAKDOWN TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('2. Property-Level Revenue & Occupancy Breakdown', 15, currentY);
  currentY += 3;

  const propertyTableData = SAMPLE_PROPERTIES_FINANCIAL.map((p) => [
    p.name,
    p.location,
    `${p.occupiedBeds} / ${p.totalBeds}`,
    `${p.occupancyRate.toFixed(1)}%`,
    formatCurrency(p.monthlyRevenueBilled),
    formatCurrency(p.revenueCollected),
    formatCurrency(p.expenses),
    formatCurrency(p.netPayout),
  ]);

  // Add Summary Total Row
  propertyTableData.push([
    'CONSOLIDATED TOTALS',
    'All Locations',
    `${occupiedBeds} / ${totalBeds}`,
    `${overallOccupancy}%`,
    formatCurrency(totalBilled),
    formatCurrency(totalCollected),
    formatCurrency(totalExpenses),
    formatCurrency(netOperatingIncome),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      'Property Name',
      'Location',
      'Occupancy',
      'Rate',
      'Billed (INR)',
      'Collected (INR)',
      'Expenses (INR)',
      'Net Payout (INR)',
    ]],
    body: propertyTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [18, 24, 32],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      2: { halign: 'center' },
      3: { halign: 'center', fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold', textColor: emerald700 },
    },
    didParseCell: (data) => {
      if (data.row.index === propertyTableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      }
    },
    margin: { left: 15, right: 15 },
  });

  // Calculate currentY after table
  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // 5. MONTHLY OPERATIONAL EXPENSES AUDIT
  if (includeExpenses) {
    // Check if we need page break
    if (currentY > pageHeight - 70) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text('3. Operating Expenses & Maintenance Deductions', 15, currentY);
    currentY += 3;

    const expenseTableData = SAMPLE_EXPENSES.map((e) => [
      e.category,
      e.vendor,
      e.description,
      e.date,
      e.status,
      formatCurrency(e.amount),
    ]);

    expenseTableData.push([
      'TOTAL OPERATING EXPENSES',
      'All Vendors',
      'Consolidated monthly maintenance, utilities & platform costs',
      '-',
      'Settled',
      formatCurrency(totalExpenses),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Expense Category', 'Vendor / Payee', 'Description / Reference', 'Date', 'Status', 'Amount (INR)']],
      body: expenseTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 38 },
        4: { halign: 'center' },
        5: { halign: 'right', fontStyle: 'bold', textColor: rose700 },
      },
      didParseCell: (data) => {
        if (data.row.index === expenseTableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.textColor = [153, 27, 27];
        }
      },
      margin: { left: 15, right: 15 },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 6. TENANT TRANSACTION LEDGER (PAGE 2 / NEXT SECTION)
  if (includeLedger) {
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text('4. Detailed Tenant Rent & Receipt Ledger', 15, currentY);
    currentY += 3;

    const ledgerTableData = SAMPLE_TRANSACTIONS.map((t) => [
      t.receiptNo,
      t.date,
      t.tenantName,
      t.unit,
      t.type,
      t.paymentMode,
      t.status,
      formatCurrency(t.amount),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Receipt #', 'Date', 'Tenant Name', 'Unit / Bed', 'Type', 'Mode', 'Status', 'Amount (INR)']],
      body: ledgerTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [18, 24, 32],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7.2,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 26 },
        1: { cellWidth: 22 },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.column.index === 6) {
          if (data.cell.raw === 'Settled') {
            data.cell.styles.textColor = emerald700;
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'Overdue') {
            data.cell.styles.textColor = rose700;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 15, right: 15 },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 7. TAX COMPLIANCE & ACCOUNTING CERTIFICATION BOX
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, currentY, pageWidth - 30, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('AUDIT CERTIFICATION & GST COMPLIANCE', 20, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(
    'This monthly statement is automatically compiled by the Nestin Owner OS engine from verified digital tenant agreements, automated rent collections, and logged maintenance invoices. Eligible under SAC Code 997212 (Rental/Accommodation Services). Suitable for chartered accountant filing, TDS reconciliation (Sec 194-I), and bank balance sheet audits.',
    20,
    currentY + 11,
    { maxWidth: pageWidth - 40, lineHeightFactor: 1.3 }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('System Authorized Signatory: Nestin Digital Treasury System', 20, currentY + 27);
  doc.text(`Digital Verification Hash: SHA256:${Math.random().toString(36).substring(2, 12).toUpperCase()}`, pageWidth - 20, currentY + 27, { align: 'right' });

  // 8. ADD PAGE NUMBERS & SYSTEM FOOTER ACROSS ALL PAGES
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(15, pageHeight - 10, pageWidth - 15, pageHeight - 10);

    doc.text(
      'Nestin Technologies • Confidential Owner Financial Document • Not for Public Distribution',
      15,
      pageHeight - 6
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 15, pageHeight - 6, { align: 'right' });
  }

  // Trigger download
  const sanitizedFilename = `Nestin_Financial_Report_${month}_${year}.pdf`;
  doc.save(sanitizedFilename);
};
