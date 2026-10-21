import { create } from 'zustand';
import { api, setAccessToken, setCsrfToken } from '@/lib/api-client';

function parseJwt(token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (_e) {
    return null;
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    setAccessToken(token);
    const jwtPayload = parseJwt(token);
    const role = user?.role || jwtPayload?.role;
    set({ user: user ? { ...user, role } : null, isAuthenticated: !!token, isLoading: false });
  },

  login: async ({ identifier, email, phone, password }) => {
    const payload = email ? { email, password } : { identifier: phone || identifier, password };
    const res = await api.post('/api/auth/login', payload);
    const { accessToken, user: apiUser, provider, customer, admin } = res.data;
    const jwtPayload = parseJwt(accessToken);

    let role = jwtPayload?.role;
    if (apiUser?.role) {
      role = apiUser.role;
    } else if (admin) {
      role = 'ADMIN';
    } else if (provider) {
      role = 'PROVIDER';
    } else if (customer) {
      role = 'CUSTOMER';
    }

    const baseUserData = apiUser || admin || provider || customer || { id: jwtPayload?.sub };
    const user = { ...baseUserData, role };

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
      const accessToken = res.data?.accessToken;
      if (!accessToken) throw new Error('No access token returned');

      const jwtPayload = parseJwt(accessToken);
      const user = { id: jwtPayload?.sub, role: jwtPayload?.role };

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
