import { create } from 'zustand';

import type { User } from '@/types/types';

type AuthStore = {
  user: User | null;
  setUser: (user: User) => void;
  deviceSessionToken: string | null;
  setDeviceSessionToken: (token: string) => void;
  clearDeviceSessionToken: () => void;
  logout: () => void; 

}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  deviceSessionToken: null,
  setDeviceSessionToken: (token) => set({ deviceSessionToken: token }),
  clearDeviceSessionToken: () => set({ deviceSessionToken: null }),
  logout: () => set({ user: null, deviceSessionToken: null }),
}));
