import { useState, useEffect, useCallback, useMemo } from 'react';

interface UseKVDataOptions<T> {
  endpoint: string;
  localKey: string;
  defaultValue: T;
  token?: string | null;
}

export function useKVData<T>({ endpoint, localKey, defaultValue, token }: UseKVDataOptions<T>) {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cachedData = useMemo(() => {
    try {
      const cached = localStorage.getItem(localKey);
      return cached ? JSON.parse(cached) as T : null;
    } catch {
      return null;
    }
  }, [localKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const res = await fetch(endpoint);
        if (!cancelled && res.ok) {
          const json = await res.json() as { success: boolean; data?: T };
          if (json.success && json.data !== undefined && json.data !== null) {
            setData(json.data);
            try {
              localStorage.setItem(localKey, JSON.stringify(json.data));
            } catch {
              // localStorage not available
            }
            setLoading(false);
            return;
          }
        }
      } catch {
        // API not available (local dev)
      }
      if (!cancelled && cachedData) {
        setData(cachedData);
      }
      if (!cancelled) {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [endpoint, localKey, cachedData]);

  const save = useCallback(async (newData: T): Promise<boolean> => {
    setData(newData);
    try {
      localStorage.setItem(localKey, JSON.stringify(newData));
    } catch {
      // localStorage not available
    }

    if (!token) return true;

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
      if (!json.success) {
        setError(json.error || 'Save failed');
        return false;
      }
      setError(null);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  }, [endpoint, localKey, token]);

  return { data, setData, save, loading, error };
}
