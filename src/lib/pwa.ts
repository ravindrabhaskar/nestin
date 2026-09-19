import { ApiClient } from './apiClient';

/**
 * Progressive-web-app plumbing: service worker registration (production only — Vite dev serves
 * un-hashed modules), the deferred install prompt, and Web Push subscription management.
 */

let deferredInstall: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;
const installListeners = new Set<(available: boolean) => void>();

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[pwa] sw registration failed', err));
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e as typeof deferredInstall;
    installListeners.forEach((l) => l(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    installListeners.forEach((l) => l(false));
  });
}

export const installPrompt = {
  available: () => !!deferredInstall,
  subscribe(listener: (available: boolean) => void): () => void {
    installListeners.add(listener);
    listener(!!deferredInstall);
    return () => {
      installListeners.delete(listener);
    };
  },
  async show(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredInstall) return 'unavailable';
    await deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    deferredInstall = null;
    installListeners.forEach((l) => l(false));
    return outcome === 'accepted' ? 'accepted' : 'dismissed';
  },
};

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Asks for permission, subscribes this device and registers it with the API. */
export async function enablePush(): Promise<'enabled' | 'denied' | 'unsupported' | 'disabled'> {
  if (!pushSupported()) return 'unsupported';
  const cfg = await ApiClient.push.config();
  if (!cfg.enabled || !cfg.publicKey) return 'disabled';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) as BufferSource,
    }));
  await ApiClient.push.subscribe(sub.toJSON());
  return 'enabled';
}

export async function disablePush(): Promise<void> {
  const sub = await currentPushSubscription();
  if (!sub) return;
  await ApiClient.push.unsubscribe(sub.endpoint).catch(() => undefined);
  await sub.unsubscribe();
}
