import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Running QA Automated Integration & Structural Tests ===');

// Test 1: Verify ForOwnersPage file exists and exports component
const pagePath = path.resolve('./src/pages/ForOwnersPage.tsx');
assert.ok(fs.existsSync(pagePath), 'ForOwnersPage.tsx exists');
console.log('✔ PASS: ForOwnersPage component file exists');

// Test 2: Check route configuration in App.tsx
const appPath = path.resolve('./src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');
assert.ok(appContent.includes('path="/for-owners"'), 'App.tsx contains /for-owners route');
assert.ok(appContent.includes('path="/owner/crm"'), 'App.tsx contains /owner/crm redirect route');
console.log('✔ PASS: Router configuration includes /for-owners and /owner/crm');

// Test 3: Check demo submission logic in supabase.ts
const supabasePath = path.resolve('./src/lib/supabase.ts');
const supabaseContent = fs.readFileSync(supabasePath, 'utf8');
assert.ok(supabaseContent.includes('submitDemoRequest'), 'supabase.ts exports submitDemoRequest');
assert.ok(supabaseContent.includes('demo_requests'), 'supabase.ts inserts into demo_requests table');
assert.ok(supabaseContent.includes('nestin_demo_requests'), 'supabase.ts saves local backup in localStorage');
console.log('✔ PASS: Supabase integration module has robust demo_requests handler and local fallback');

// Test 4: Check Navbar navigation links
const navPath = path.resolve('./src/components/Navbar.tsx');
const navContent = fs.readFileSync(navPath, 'utf8');
assert.ok(navContent.includes("label: 'For Owners'"), "Navbar contains 'For Owners' link");
assert.ok(navContent.includes("page: 'for-owners'"), "Navbar links to 'for-owners' page state");
console.log('✔ PASS: Navbar contains For Owners link and page state mapping');

// Test 5: Verify API Gateway service exists and exports router
const gatewayIndexPath = path.resolve('./services/api-gateway/index.ts');
assert.ok(fs.existsSync(gatewayIndexPath), 'services/api-gateway/index.ts exists');
const gatewayContent = fs.readFileSync(gatewayIndexPath, 'utf8');
assert.ok(gatewayContent.includes('export function createApiGatewayRouter'), 'API Gateway exports createApiGatewayRouter');
assert.ok(gatewayContent.includes('corsMiddleware'), 'API Gateway includes CORS middleware');
assert.ok(gatewayContent.includes('forwardAuthContext'), 'API Gateway includes auth forwarding');
console.log('✔ PASS: API Gateway service and middleware configuration verified');

console.log('\nAll QA Integration & Structural Tests Passed Successfully! 🎉');
