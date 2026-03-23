import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  accessToken: null,
  isLoading: true,
  setUser: user => set({ user }),
  setAccessToken: accessToken => set({ accessToken }),
  logout: () => {
    set({ user: null, accessToken: null });
    window.location.href = '/login';
  },
  setLoading: isLoading => set({ isLoading }),
}));
