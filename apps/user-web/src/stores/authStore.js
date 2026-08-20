import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  organizations: [],
  activeOrganization: null,
  isAuthenticated: Boolean(localStorage.getItem('access_token')),
  isLoading: false,

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', credentials);
      const { user, organizations, tokens } = res.data;

      localStorage.setItem('access_token', tokens.accessToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
      if (organizations[0]) {
        localStorage.setItem('active_org_id', organizations[0].id);
      }

      set({
        user,
        organizations,
        activeOrganization: organizations[0] || null,
        isAuthenticated: true,
        isLoading: false
      });
      return res;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', data);
      const { user, organization, tokens } = res.data;

      localStorage.setItem('access_token', tokens.accessToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
      localStorage.setItem('active_org_id', organization.id);

      set({
        user,
        organizations: [organization],
        activeOrganization: organization,
        isAuthenticated: true,
        isLoading: false
      });
      return res;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  fetchCurrentUser: async () => {
    try {
      const res = await api.get('/auth/me');
      set({
        user: res.data.user,
        isAuthenticated: true
      });
    } catch (err) {
      set({ isAuthenticated: false, user: null });
    }
  },

  setActiveOrganization: (org) => {
    localStorage.setItem('active_org_id', org.id);
    set({ activeOrganization: org });
    window.location.reload();
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('active_org_id');
    set({ user: null, organizations: [], activeOrganization: null, isAuthenticated: false });
    window.location.href = '/login';
  }
}));

export default useAuthStore;
