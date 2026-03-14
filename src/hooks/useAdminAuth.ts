import { useState, useCallback } from 'react';

interface UseAdminAuthReturn {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const ADMIN_PASSWORD = 'zoro2024';

export function useAdminAuth(): UseAdminAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = sessionStorage.getItem('zoro_admin_auth');
    return auth === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (password: string): Promise<boolean> => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('zoro_admin_auth', 'true');
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('zoro_admin_auth');
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout, isLoading };
}
