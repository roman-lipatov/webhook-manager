import { create } from "zustand";

import type { User } from "@/types/types";

export type AuthStatus = "bootstrapping" | "authenticated" | "unauthenticated";

type AuthStore = {
  user: User | null;
  status: AuthStatus;
  deviceSessionToken: string | null;
  setUser: (user: User) => void;
  setDeviceSessionToken: (token: string) => void;
  clearDeviceSessionToken: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  status: "bootstrapping",
  deviceSessionToken: null,
  setUser: (user) => set({ user, status: "authenticated" }),
  setDeviceSessionToken: (token) => set({ deviceSessionToken: token }),
  clearDeviceSessionToken: () => set({ deviceSessionToken: null }),
  logout: () =>
    set({
      user: null,
      deviceSessionToken: null,
      status: "unauthenticated",
    }),
}));
