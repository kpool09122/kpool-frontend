"use client";

import { create } from "zustand";

import { fetchCurrentAuthenticatedIdentity } from "@/gateways/identity/authIdentityBrowserApi";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";

type AuthStatus = "authenticated" | "guest" | "loading";

type AuthStore = {
  identity: AuthenticatedIdentitySummary | null;
  status: AuthStatus;
  sessionVersion: number;
  setIdentity: (identity: AuthenticatedIdentitySummary | null) => void;
  clearIdentity: () => void;
  refreshIdentity: (options?: { preserveOnNull?: boolean }) => Promise<AuthenticatedIdentitySummary | null>;
};

export type AuthIdentityRefresh = AuthStore["refreshIdentity"];

export const useAuthStore = create<AuthStore>((set, get) => ({
  identity: null,
  status: "loading",
  sessionVersion: 0,
  setIdentity: (identity) =>
    set((state) => ({
      identity,
      status: identity ? "authenticated" : "guest",
      sessionVersion: identity ? state.sessionVersion : state.sessionVersion + 1,
    })),
  clearIdentity: () =>
    set((state) => ({
      identity: null,
      status: "guest",
      sessionVersion: state.sessionVersion + 1,
    })),
  refreshIdentity: async ({ preserveOnNull = false } = {}) => {
    const sessionVersion = get().sessionVersion;
    const hadIdentity = get().identity !== null;
    set({ status: "loading" });
    const identity = await fetchCurrentAuthenticatedIdentity();

    if (get().sessionVersion !== sessionVersion) return null;

    if (identity === null && preserveOnNull) {
      set((state) => ({
        status: state.identity ? "authenticated" : "guest",
      }));
      return null;
    }

    set((state) => ({
      identity,
      status: identity ? "authenticated" : "guest",
      sessionVersion: identity || !hadIdentity ? state.sessionVersion : state.sessionVersion + 1,
    }));

    return identity;
  },
}));
