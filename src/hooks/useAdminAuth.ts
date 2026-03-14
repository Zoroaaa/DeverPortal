import { useState, useCallback } from 'react';

interface UseAdminAuthReturn {
  isAuthenticated: boolean;
  token: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const SESSION_KEY = 'zoro_admin_token';

export function useAdminAuth(): UseAdminAuthReturn {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(SESSION_KEY));
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { success: boolean; token?: string };
      if (data.success && data.token) {
        sessionStorage.setItem(SESSION_KEY, data.token);
        setToken(data.token);
        return true;
      }
    } catch {
      // fallback to hardcoded for local dev
      if (password === 'zoro2024') {
        const fakeToken = 'local-dev-token';
        sessionStorage.setItem(SESSION_KEY, fakeToken);
        setToken(fakeToken);
        return true;
      }
    } finally {
      setIsLoading(false);
    }
    setIsLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setToken(null);
  }, []);

  return { isAuthenticated: !!token, token, login, logout, isLoading };
}
