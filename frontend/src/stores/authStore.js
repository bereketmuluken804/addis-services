import { create } from 'zustand';
import { api, setAccessToken, setCsrfToken } from '@/lib/api-client';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    setAccessToken(token);
    set({ user, isAuthenticated: !!user, isLoading: false });
  },

  login: async ({ identifier, email, phone, password }) => {
    const payload = email ? { email, password } : { identifier: phone || identifier, password };
    const res = await api.post('/api/auth/login', payload);
    const { accessToken, role, ...userFields } = res.data;
    const user = { ...userFields, role };
    setAccessToken(accessToken);
    set({ user, isAuthenticated: true, isLoading: false });
    return user;
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch (_err) {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      setCsrfToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkSession: async () => {
    try {
      const res = await api.post('/api/auth/refresh', {});
      const { accessToken, role, ...userFields } = res.data;
      const user = { ...userFields, role };
      setAccessToken(accessToken);
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (_err) {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
      return null;
    }
  },
}));
