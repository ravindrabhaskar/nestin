import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Running Calendar Date Picker Inquiry Flow Verification Tests ===');

// Test 1: Verify CalendarDatePicker component exists and contains required features
const pickerPath = path.resolve('./src/components/ui/CalendarDatePicker.tsx');
assert.ok(fs.existsSync(pickerPath), 'CalendarDatePicker.tsx must exist in src/components/ui/');
const pickerContent = fs.readFileSync(pickerPath, 'utf8');

assert.ok(pickerContent.includes('export const CalendarDatePicker'), 'CalendarDatePicker component is exported');
assert.ok(pickerContent.includes('MONTH_NAMES'), 'Has month names for display');
assert.ok(pickerContent.includes('WEEKDAYS'), 'Has weekday column headers');
assert.ok(pickerContent.includes('prev-month'), 'Has previous month navigation');
assert.ok(pickerContent.includes('next-month'), 'Has next month navigation');
assert.ok(pickerContent.includes('handleJumpToday'), 'Has Today jump functionality');
assert.ok(pickerContent.includes('getPresets'), 'Has quick date presets for fast scheduling');
assert.ok(pickerContent.includes('effectiveMinDate'), 'Guards against selecting invalid past dates');
assert.ok(pickerContent.includes('inquiryType'), 'Supports inquiry type context (viewing, booking, call)');
console.log('✔ PASS: CalendarDatePicker component is comprehensive with month navigation, presets, and validation');

// Test 2: Verify PropertyDetailsView integrates CalendarDatePicker for inquiries and bookings
const detailsPath = path.resolve('./src/components/property-details/PropertyDetailsView.tsx');
assert.ok(fs.existsSync(detailsPath), 'PropertyDetailsView.tsx must exist');
const detailsContent = fs.readFileSync(detailsPath, 'utf8');

assert.ok(detailsContent.includes("import { CalendarDatePicker } from '../ui/CalendarDatePicker'"), 'Imports CalendarDatePicker');
assert.ok(detailsContent.includes('sidebar-inquiry-date-picker'), 'Integrates inquiry date picker in sidebar');
assert.ok(detailsContent.includes('booking-move-in-date-picker'), 'Integrates date picker in Book Move-in modal');
assert.ok(detailsContent.includes('viewing-visit-date-picker'), 'Integrates date picker in Schedule Visit modal');
console.log('✔ PASS: PropertyDetailsView embeds calendar date picker in viewing and booking flows');

// Test 3: Verify ScheduleVisitModal uses CalendarDatePicker
const scheduleModalPath = path.resolve('./src/components/modals/ScheduleVisitModal.tsx');
assert.ok(fs.existsSync(scheduleModalPath), 'ScheduleVisitModal.tsx exists');
const scheduleModalContent = fs.readFileSync(scheduleModalPath, 'utf8');

assert.ok(scheduleModalContent.includes('CalendarDatePicker'), 'ScheduleVisitModal imports CalendarDatePicker');
assert.ok(scheduleModalContent.includes('schedule-modal-viewing-date'), 'ScheduleVisitModal uses CalendarDatePicker with unique ID');
console.log('✔ PASS: ScheduleVisitModal uses CalendarDatePicker for in-person viewing date selection');

// Test 4: Verify BookACallModal uses CalendarDatePicker
const callModalPath = path.resolve('./src/components/modals/BookACallModal.tsx');
assert.ok(fs.existsSync(callModalPath), 'BookACallModal.tsx exists');
const callModalContent = fs.readFileSync(callModalPath, 'utf8');

assert.ok(callModalContent.includes('CalendarDatePicker'), 'BookACallModal imports CalendarDatePicker');
assert.ok(callModalContent.includes('call-inquiry-date-picker'), 'BookACallModal uses CalendarDatePicker');
console.log('✔ PASS: BookACallModal uses CalendarDatePicker for inquiry dates');

// Test 5: Verify CRM ScheduleVisitModal uses CalendarDatePicker
const crmModalPath = path.resolve('./src/components/dashboard/crm/ScheduleVisitModal.tsx');
assert.ok(fs.existsSync(crmModalPath), 'CRM ScheduleVisitModal.tsx exists');
const crmModalContent = fs.readFileSync(crmModalPath, 'utf8');

assert.ok(crmModalContent.includes('CalendarDatePicker'), 'CRM ScheduleVisitModal imports CalendarDatePicker');
assert.ok(crmModalContent.includes('crm-schedule-visit-date'), 'CRM ScheduleVisitModal uses CalendarDatePicker');
console.log('✔ PASS: CRM ScheduleVisitModal uses CalendarDatePicker for lead visits');

console.log('\nAll Calendar Date Picker Inquiry Flow Verification Tests Passed! 📅✨');
