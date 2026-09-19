# NestIn on mobile

NestIn is an installable PWA (manifest, service worker, offline page, web push). For store presence it ships as a
Capacitor shell around the same build.

## Build the native shells

```bash
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/android @capacitor/ios
npm run build
npx cap add android
npx cap add ios          # macOS + Xcode only
npx cap sync
npx cap open android     # Android Studio → Build → Generate Signed Bundle
```

`capacitor.config.ts` uses `dist/` as the web directory. Set `CAPACITOR_SERVER_URL=https://<your-domain>` to make the
shell load the deployed site (recommended: one origin for cookies, OAuth and deep links) rather than the bundled copy.

## What works out of the box
- Everything in the web app, including Razorpay checkout (opens in the in-app browser) and the installable UI.
- Web push on Android (Chrome web view honours the VAPID subscription).

## What needs native plugins
- iOS push → `@capacitor/push-notifications` + APNs keys; register the device token with `/api/v1/push/subscribe`
  using a `{ endpoint: 'apns://<token>' }` shape and add an APNs sender next to `server/lib/push.ts`.
- Camera for KYC/photos → `@capacitor/camera` (the `<input type="file">` fallback already works).
- Deep links → configure `applinks` / `assetlinks.json` for `/property/*` and `/verify-email`.

## Store checklist
- Privacy policy and refund policy URLs (`/privacy`, `/refund-policy`) are required by both stores.
- Set `appId` in `capacitor.config.ts` to your reverse-domain identifier before the first build.
