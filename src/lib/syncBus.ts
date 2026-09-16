/**
 * Tiny pub/sub used by the data contexts to surface background persistence failures to the UI
 * (a toast) without coupling them to any component tree.
 */
export type SyncNotice = { kind: 'error' | 'success' | 'info'; message: string; id: number };

type Listener = (notice: SyncNotice) => void;
const listeners = new Set<Listener>();
let counter = 0;

export const syncBus = {
  publish(kind: SyncNotice['kind'], message: string): void {
    const notice = { kind, message, id: ++counter };
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
  syncBus.publish('error', `${context}: ${message}`);
}
