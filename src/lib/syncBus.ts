/**
 * Tiny pub/sub used by the data contexts to surface background persistence failures to the UI
 * (a toast) without coupling them to any component tree.
 */
export type SyncNotice = {
  kind: 'error' | 'success' | 'info';
  message: string;
  id: number;
  /** Optional call to action rendered as a link (e.g. "Upgrade plan"). */
  action?: { label: string; href: string };
};

type Listener = (notice: SyncNotice) => void;
const listeners = new Set<Listener>();
let counter = 0;

export const syncBus = {
  publish(kind: SyncNotice['kind'], message: string, action?: SyncNotice['action']): void {
    const notice = { kind, message, id: ++counter, action };
    listeners.forEach((l) => l(notice));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function reportSyncError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.warn(`[sync] ${context}:`, err);
  const code = (err as { code?: string })?.code;
  const planLimited = code === 'PLAN_LIMIT' || code === 'PLAN_FEATURE';
  syncBus.publish(
    'error',
    `${context}: ${message}`,
    planLimited ? { label: 'View plans', href: '/owner/subscription' } : undefined
  );
}
