import { useCallback, useEffect, useRef, useState } from 'react';
import { reportSyncError } from '../lib/syncBus';

/**
 * Loads a resource from the API and exposes local state for optimistic edits.
 * `enabled` gates the fetch (e.g. until auth has resolved); `key` re-runs it when it changes.
 */
export function useApiResource<T>(
  fetcher: () => Promise<T>,
  initial: T,
  options: { enabled?: boolean; key?: string; label?: string } = {}
) {
  const { enabled = true, key = '', label = 'Could not load data' } = options;
  const [data, setData] = useState<T>(initial);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetcherRef.current());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      reportSyncError(label, err);
    } finally {
      setIsLoading(false);
    }
  }, [label]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void reload();
  }, [enabled, key, reload]);

  return { data, setData, isLoading, error, reload };
}
