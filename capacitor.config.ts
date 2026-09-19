// Typed loosely so the repo compiles before `@capacitor/cli` is installed; swap for
// `import type { CapacitorConfig } from '@capacitor/cli'` once the packages are added.
type CapacitorConfig = Record<string, unknown>;

/**
 * Native wrappers for the Play Store / App Store. The web app is served from `dist/` inside the
 * shell and talks to the production API over HTTPS. One-time setup (not run in CI):
 *
 *   npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android @capacitor/ios
 *   npm run build && npx cap add android && npx cap add ios
 *   npx cap sync && npx cap open android   # or ios
 *
 * Push notifications on native use the same VAPID web-push subscription through the web view on
 * Android; iOS requires APNs via @capacitor/push-notifications — see docs/MOBILE.md.
 */
const config: CapacitorConfig = {
  appId: 'app.nestin.finds',
  appName: 'NestIn',
  webDir: 'dist',
  server: {
    // Point the shell at the live site so deep links and OAuth redirects resolve to the same origin.
    url: process.env.CAPACITOR_SERVER_URL || undefined,
    cleartext: false,
  },
  android: { allowMixedContent: false, backgroundColor: '#FAF9F5' },
  ios: { contentInset: 'automatic', backgroundColor: '#FAF9F5' },
};

export default config;
