import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { get, post } from './api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('stures_token'));

  useEffect(() => {
    if (!localStorage.getItem('stures_token')) return;
    get('/auth/me').then((d) => setUser(d.user)).catch(() => localStorage.removeItem('stures_token')).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await post('/auth/login', { email, password });
    localStorage.setItem('stures_token', d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const adopt = useCallback((d) => {
    localStorage.setItem('stures_token', d.token);
    setUser(d.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('stures_token');
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, loading, login, logout, adopt }}>{children}</AuthCtx.Provider>;
}

export const homeFor = (role) => (role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student');
