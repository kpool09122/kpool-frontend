"use client";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuthStore } from "@/gateways/auth/authStore";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import type { WikiResourceType } from "@kpool/wiki";

const schema = z.object({
  canDelete: z.boolean(),
  principalIdentifier: z.string().min(1).nullable(),
});
const fetchAccess = async (
  resourceType: WikiResourceType,
  signal: AbortSignal,
) => {
  try {
    const response = await browserApiFetch(
      `/api/wiki/videos/delete-access?resourceType=${resourceType}`,
      {
        credentials: "include",
        cache: "no-store",
        signal,
      },
    );
    if (!response.ok) return null;
    const result = schema.safeParse(await response.json());
    return result.success && result.data.canDelete
      ? result.data.principalIdentifier
      : null;
  } catch {
    return null;
  }
};
export function useWikiVideoDeleteAccess(resourceType: WikiResourceType) {
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const state = useAuthStore.getState();
    // Public routes do not mount AdminProvider, so direct visits need an initial auth check.
    if (
      state.status === "loading" &&
      state.identity === null &&
      state.sessionVersion === 0
    )
      void refreshIdentity();
  }, [refreshIdentity]);
  const identity = useAuthStore((state) => state.identity);
  const status = useAuthStore((state) => state.status);
  const version = useAuthStore((state) => state.sessionVersion);
  const sessionKey = [
    status,
    identity?.identityIdentifier,
    identity?.accountIdentifier,
    identity?.accountPrincipalIdentifier,
    version,
  ].join(":");
  const query = useQuery({
    queryKey: ["wiki-video-delete-access", resourceType, sessionKey],
    queryFn: ({ signal }) => fetchAccess(resourceType, signal),
    enabled: status === "authenticated",
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  return {
    sessionKey,
    principalIdentifier:
      status === "authenticated" &&
      query.isFetchedAfterMount &&
      !query.isFetching
        ? (query.data ?? null)
        : null,
  };
}
