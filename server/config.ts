import crypto from 'node:crypto';
import path from 'node:path';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function requireSecret(name: string, fallbackForDev: () => string): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (isProduction) {
    throw new Error(`${name} must be set to a random string of at least 32 characters in production`);
  }
  return fallbackForDev();
}

// A per-process random secret is used in dev/test when none is configured. Tokens will not
// survive a restart, which is the desired behaviour for an unconfigured secret.
const devSecret = crypto.randomBytes(48).toString('base64url');

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  isTest,
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,

  databasePath: isTest ? ':memory:' : process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'nestin.db'),
  // Demo data is opt-out in development but opt-in in production: a live deployment must never
  // carry the documented demo accounts unless the operator explicitly asks for them.
  seedDemoData: isProduction ? process.env.SEED_DEMO_DATA === 'true' : process.env.SEED_DEMO_DATA !== 'false',

  jwtSecret: requireSecret('JWT_SECRET', () => devSecret),
  jwtTtlSeconds: Number(process.env.JWT_TTL_SECONDS || 60 * 60 * 24 * 7),

  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  superAdmin: {
    email: (process.env.SUPER_ADMIN_EMAIL || 'admin@nestin.io').toLowerCase(),
    password: process.env.SUPER_ADMIN_PASSWORD || (isProduction ? '' : 'Admin@NestIn2026'),
    accessCode: process.env.SUPER_ADMIN_ACCESS_CODE || (isProduction ? '' : 'NESTIN-SUPER-ADMIN-2026'),
  },

  demoPassword: process.env.DEMO_PASSWORD || 'NestIn@2026',
  /** In production, online payments are only accepted through a configured gateway — never simulated. */
  allowSimulatedPayments: !isProduction || process.env.ALLOW_SIMULATED_PAYMENTS === 'true',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    get enabled() {
      return !!(this.keyId && this.keySecret);
    },
  },

  storage: {
    /** "local" (default) writes under uploadsDir; "s3" uses any S3-compatible bucket (AWS, R2, MinIO). */
    driver: (process.env.STORAGE_DRIVER || (process.env.S3_BUCKET ? 's3' : 'local')) as 'local' | 's3',
    uploadsDir:
      process.env.UPLOADS_DIR ||
      path.join(
        path.dirname(
          isTest
            ? path.join(process.cwd(), 'data', 'x')
            : process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'nestin.db')
        ),
        'uploads'
      ),
    maxFileBytes: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024,
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      /** Public base URL for objects stored with public access (e.g. a CDN); private objects use presigned URLs. */
      publicBaseUrl: (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/+$/, ''),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    },
  },

  messaging: {
    emailProvider: (process.env.EMAIL_PROVIDER ||
      (process.env.RESEND_API_KEY ? 'resend' : process.env.SENDGRID_API_KEY ? 'sendgrid' : 'log')) as
      'resend' | 'sendgrid' | 'log',
    emailFrom: process.env.EMAIL_FROM || 'NestIn <no-reply@nestin.local>',
    resendApiKey: process.env.RESEND_API_KEY || '',
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || '',
      get enabled() {
        return !!(this.accountSid && this.authToken && this.whatsappFrom);
      },
    },
  },

  jobs: {
    rentDueDay: Number(process.env.RENT_DUE_DAY || 5),
    enabled: process.env.DISABLE_JOBS !== 'true' && !isTest,
  },

  billing: {
    /** Percentage of every online rent/deposit payment retained by the platform (0 disables). */
    platformFeePercent: Math.min(20, Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT || 0))),
    /** Days a Professional trial lasts for newly registered owners (0 = no trial). */
    trialDays: Math.max(0, Number(process.env.PLAN_TRIAL_DAYS || 14)),
    /** GST applied to subscription invoices (India: 18%). */
    gstPercent: Math.max(0, Number(process.env.SUBSCRIPTION_GST_PERCENT || 18)),
  },

  verification: {
    /** Months a "NestIn Verified" badge stays valid before a re-verification visit is due. */
    validityMonths: Math.max(1, Number(process.env.VERIFICATION_VALIDITY_MONTHS || 12)),
  },

  backups: {
    enabled: process.env.DISABLE_BACKUPS !== 'true' && !isTest,
    dir: process.env.BACKUP_DIR || '',
    keep: Math.max(1, Number(process.env.BACKUP_KEEP || 14)),
    /** When set with an S3 driver, backups are also copied to the bucket under this prefix. */
    s3Prefix: process.env.BACKUP_S3_PREFIX || 'backups/',
  },

  push: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:support@nestin.local',
    get enabled() {
      return !!(this.publicKey && this.privateKey);
    },
  },

  logging: {
    /** "json" (default in production) emits one JSON object per request; "pretty" is for terminals; "off" silences. */
    format: (process.env.LOG_FORMAT || (isProduction ? 'json' : isTest ? 'off' : 'pretty')) as
      'json' | 'pretty' | 'off',
  },

  rateLimit: {
    authWindowMs: 15 * 60 * 1000,
    authMaxAttempts: Number(process.env.AUTH_MAX_ATTEMPTS || 20),
    apiWindowMs: 60 * 1000,
    apiMaxRequests: Number(process.env.API_MAX_REQUESTS_PER_MINUTE || 600),
  },
};

export type AppConfig = typeof config;

/**
 * Production start-up invariants. Anything here is a mis-configuration that would otherwise fail
 * silently (free plans, public demo accounts), so the process refuses to boot instead.
 */
export function assertProductionConfig(c: AppConfig = config): void {
  if (!c.isProduction) return;
  const problems: string[] = [];
  if (c.seedDemoData && c.demoPassword === 'NestIn@2026') {
    problems.push('SEED_DEMO_DATA=true requires a non-default DEMO_PASSWORD');
  }
  if (!c.razorpay.enabled && !c.allowSimulatedPayments) {
    problems.push(
      'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set; online payments would be simulated. Configure the gateway or set ALLOW_SIMULATED_PAYMENTS=true for a staging deployment.'
    );
  }
  if (c.razorpay.enabled && !c.razorpay.webhookSecret) {
    problems.push('RAZORPAY_WEBHOOK_SECRET must be set when Razorpay keys are configured');
  }
  if (!c.superAdmin.password || !c.superAdmin.accessCode) {
    problems.push('SUPER_ADMIN_PASSWORD and SUPER_ADMIN_ACCESS_CODE must be set');
  }
  if (!process.env.METRICS_TOKEN) {
    problems.push('METRICS_TOKEN must be set so /metrics is not exposed');
  }
  if (problems.length) {
    throw new Error(['Refusing to start in production:', ...problems.map((p) => ` - ${p}`)].join('\n'));
  }
}
