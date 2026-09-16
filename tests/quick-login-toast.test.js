import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Running Quick Login Toast Notification Verification Tests ===');

// Test 1: QuickLoginToast component exists and is well-structured
const toastPath = path.resolve('./src/components/QuickLoginToast.tsx');
assert.ok(fs.existsSync(toastPath), 'QuickLoginToast.tsx must exist');
const toastContent = fs.readFileSync(toastPath, 'utf8');

assert.ok(toastContent.includes('quick-login-toast'), 'QuickLoginToast contains toast element with id');
assert.ok(toastContent.includes('quick-login-google-btn'), 'QuickLoginToast contains Google quick login button');
assert.ok(toastContent.includes('quick-login-email-btn'), 'QuickLoginToast contains email sign in option');
assert.ok(toastContent.includes('quick-login-dismiss-btn'), 'QuickLoginToast contains dismiss button');
assert.ok(toastContent.includes('loginWithGoogle'), 'QuickLoginToast triggers loginWithGoogle');
assert.ok(toastContent.includes('addToWishlist'), 'QuickLoginToast auto-saves property to wishlist upon authentication');
console.log('✔ PASS: QuickLoginToast component exists with all required action elements and IDs');

// Test 2: WishlistContext provides quickLoginToast state and triggers
const wishlistPath = path.resolve('./src/context/WishlistContext.tsx');
assert.ok(fs.existsSync(wishlistPath), 'WishlistContext.tsx must exist');
const wishlistContent = fs.readFileSync(wishlistPath, 'utf8');

assert.ok(wishlistContent.includes('quickLoginToast'), 'WishlistContext exposes quickLoginToast state');
assert.ok(wishlistContent.includes('showQuickLoginToast'), 'WishlistContext provides showQuickLoginToast function');
assert.ok(wishlistContent.includes('hideQuickLoginToast'), 'WishlistContext provides hideQuickLoginToast function');
assert.ok(wishlistContent.includes('isAuthenticated'), 'WishlistContext checks isAuthenticated');
console.log('✔ PASS: WishlistContext manages quickLoginToast state and authentication guard');

// Test 3: PropertyCard triggers showQuickLoginToast when unauthenticated user attempts to favorite
const cardPath = path.resolve('./src/components/PropertyCard.tsx');
assert.ok(fs.existsSync(cardPath), 'PropertyCard.tsx must exist');
const cardContent = fs.readFileSync(cardPath, 'utf8');

assert.ok(cardContent.includes('showQuickLoginToast'), 'PropertyCard uses showQuickLoginToast');
assert.ok(cardContent.includes('!isAuthenticated'), 'PropertyCard guards favorite action with isAuthenticated check');
assert.ok(cardContent.includes('showQuickLoginToast(property)'), 'PropertyCard triggers showQuickLoginToast when unauthenticated');
console.log('✔ PASS: PropertyCard prompts Quick Login toast when saving to favorites without being logged in');

// Test 4: App.tsx mounts QuickLoginToast globally inside WishlistProvider
const appPath = path.resolve('./src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

assert.ok(appContent.includes('<QuickLoginToast />') || appContent.includes('<QuickLoginToast/>'), 'App.tsx renders QuickLoginToast component');
assert.ok(appContent.includes("import { QuickLoginToast } from './components/QuickLoginToast'"), 'App.tsx imports QuickLoginToast');
console.log('✔ PASS: QuickLoginToast is mounted at root in App.tsx');

// Test 5: PropertyDetailsView also triggers quickLoginToast when saving to favorites
const detailsPath = path.resolve('./src/components/property-details/PropertyDetailsView.tsx');
const detailsContent = fs.readFileSync(detailsPath, 'utf8');

assert.ok(detailsContent.includes('showQuickLoginToast'), 'PropertyDetailsView integrates showQuickLoginToast');
assert.ok(detailsContent.includes('details-favorite-btn-'), 'PropertyDetailsView contains favorite button with ID');
console.log('✔ PASS: PropertyDetailsView has favorites button integrated with Quick Login toast');

console.log('\nAll Quick Login Toast Verification Tests Passed! 🌟');
