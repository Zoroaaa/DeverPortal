/**
 * Generic hook to load/save data from Cloudflare KV via Pages Functions.
 * Falls back to localStorage when running locally (no /api).
 */
import { useState, useEffect, useCallback } from 'react';

interface UseKVDataOptions<T> {
  endpoint: string;       // e.g. '/api/projects'
  localKey: string;       // localStorage fallback key
  defaultValue: T;
  token?: string | null;  // admin token for write operations
}

export function useKVData<T>({ endpoint, localKey, defaultValue, token }: UseKVDataOptions<T>) {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json() as { success: boolean; data?: T };
        if (json.success && json.data !== undefined && json.data !== null) {
          setData(json.data);
          // Sync to localStorage as cache
          try { localStorage.setItem(localKey, JSON.stringify(json.data)); } catch {}
          return;
        }
      }
    } catch {
      // API not available (local dev) — use localStorage
    }
    // Fallback to localStorage
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) setData(JSON.parse(cached));
    } catch {}
    setLoading(false);
  }, [endpoint, localKey]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Save
  const save = useCallback(async (newData: T): Promise<boolean> => {
    // Optimistic update
    setData(newData);
    try { localStorage.setItem(localKey, JSON.stringify(newData)); } catch {}

    if (!token) return true; // local-only mode

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newData),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) { setError(json.error || 'Save failed'); return false; }
      setError(null);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  }, [endpoint, localKey, token]);

  return { data, setData, save, load, loading, error };
}
