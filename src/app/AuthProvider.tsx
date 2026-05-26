"use client";

import { useState } from "react";

import { useAuthStore } from "@/gateways/auth/authStore";
import type { IdentitySummary } from "@/gateways/identity/identityApi";

type AuthProviderProps = {
  children: React.ReactNode;
  initialIdentity: IdentitySummary | null;
};

export function AuthProvider({ children, initialIdentity }: AuthProviderProps) {
  useState(() => {
    useAuthStore.setState({
      identity: initialIdentity,
      status: initialIdentity ? "authenticated" : "guest",
    });
  });

  return children;
}
