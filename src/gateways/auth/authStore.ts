"use client";

import { create } from "zustand";

import { fetchCurrentAuthenticatedIdentity } from "@/gateways/identity/authIdentityBrowserApi";
import type { IdentitySummary } from "@/gateways/identity/identityApi";

type AuthStatus = "authenticated" | "guest" | "loading";

type AuthStore = {
  identity: IdentitySummary | null;
  status: AuthStatus;
  setIdentity: (identity: IdentitySummary | null) => void;
  clearIdentity: () => void;
  refreshIdentity: (options?: { preserveOnNull?: boolean }) => Promise<IdentitySummary | null>;
};

export type AuthIdentityRefresh = AuthStore["refreshIdentity"];

export const useAuthStore = create<AuthStore>((set) => ({
  identity: null,
  status: "loading",
  setIdentity: (identity) =>
    set({
      identity,
      status: identity ? "authenticated" : "guest",
    }),
  clearIdentity: () =>
    set({
      identity: null,
      status: "guest",
    }),
  refreshIdentity: async ({ preserveOnNull = false } = {}) => {
    set({ status: "loading" });
    const identity = await fetchCurrentAuthenticatedIdentity();

    if (identity === null && preserveOnNull) {
      set((state) => ({
        status: state.identity ? "authenticated" : "guest",
      }));
      return null;
    }

    set({
      identity,
      status: identity ? "authenticated" : "guest",
    });

    return identity;
  },
}));
