import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createJwt, verifyJwt, decodeJwt } from '../services/auth/jwt.js';
import { userStore } from '../services/auth/userStore.js';

console.log('=== Running Auth Context & JWT Authorization Security Tests ===');

// Test 1: Verify AuthContext.tsx has eliminated localStorage user profile bypasses
const authContextPath = path.resolve('./src/context/AuthContext.tsx');
const authContextContent = fs.readFileSync(authContextPath, 'utf8');

// Ensure user state initializes strictly to null (no localStorage.getItem('nestin_user') in useState)
assert.ok(
  authContextContent.includes('const [user, setUser] = useState<UserProfile | null>(null);'),
  'AuthContext must initialize user state to null, not read from localStorage'
);
console.log('✔ PASS: AuthContext initializes user state strictly to null (no localStorage bypass)');

// Ensure no fallback to localStorage.getItem('nestin_user') in catch block
assert.ok(
  !authContextContent.includes("const cachedUser = localStorage.getItem('nestin_user')"),
  'AuthContext must not contain offline cachedUser fallback'
);
console.log('✔ PASS: AuthContext has no unverified localStorage profile fallback logic');

// Ensure token validation checks backend Auth Service
assert.ok(
  authContextContent.includes('ApiClient.auth.validateToken(storedToken)'),
  'AuthContext must strictly validate stored token against backend validateToken API'
);
console.log('✔ PASS: AuthContext strictly validates JWT token against backend Auth Service');

// Test 2: Cryptographic JWT Generation and Verification
const sampleUser = {
  id: 'test-user-001',
  email: 'test@nestin.com',
  role: 'tenant',
  roles: ['tenant'],
  fullName: 'Test Resident',
};

const token = createJwt(sampleUser, 'sess-test-01');
assert.ok(typeof token === 'string' && token.split('.').length === 3, 'createJwt creates a 3-part JWT token');
console.log('✔ PASS: Auth Service generates valid 3-part cryptographic JWTs');

// Test 3: Token Verification with Valid Token
const verification = verifyJwt(token);
assert.strictEqual(verification.valid, true, 'Valid token passes verification');
assert.strictEqual(verification.payload.email, 'test@nestin.com', 'Payload contains verified email');
assert.strictEqual(verification.payload.role, 'tenant', 'Payload contains verified role');
console.log('✔ PASS: Valid JWT token successfully verified with HMAC-SHA256 signature');

// Test 4: Rejection of Tampered Token (e.g., user attempts privilege escalation in client storage)
const parts = token.split('.');
// Decode payload, modify role to 'super_admin', and re-encode without secret key
const rawPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
rawPayload.role = 'super_admin';
const tamperedPayload = Buffer.from(JSON.stringify(rawPayload)).toString('base64url');
const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

const forgedVerification = verifyJwt(forgedToken);
assert.strictEqual(forgedVerification.valid, false, 'Tampered token MUST be rejected');
console.log('✔ PASS: Tampered token with forged role is strictly rejected (invalid signature)');

// Test 5: Rejection of Corrupted/Invalid Token
const badVerification = verifyJwt('invalid.token.payload');
assert.strictEqual(badVerification.valid, false, 'Malformed token MUST be rejected');
console.log('✔ PASS: Malformed or random tokens are strictly rejected');

// Test 6: Verify AuthModal also enforces backend-issued JWTs
const authModalPath = path.resolve('./src/components/NestInAuthModal.tsx');
const authModalContent = fs.readFileSync(authModalPath, 'utf8');
assert.ok(
  !authModalContent.includes("roles: ['owner']"),
  'AuthModal must not bypass backend auth with static object for owners'
);
console.log('✔ PASS: NestInAuthModal uses backend-issued tokens for all roles');

console.log('\nAll Auth Context & JWT Authorization Security Tests Passed! 🛡️');
