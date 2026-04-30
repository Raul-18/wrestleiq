import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, signup as apiSignup } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getMe();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (username, password) => {
      const data = await apiLogin(username, password);
      setUser(data.user);
      return data;
    },
    []
  );

  const signup = useCallback(
    async (username, password) => {
      const data = await apiSignup(username, password);
      setUser(data.user);
      return data;
    },
    []
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refresh }),
    [user, loading, login, signup, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
