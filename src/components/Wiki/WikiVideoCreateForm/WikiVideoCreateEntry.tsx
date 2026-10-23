"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/gateways/auth/authStore";
import { fetchWikiVideoAccess } from "@/gateways/wiki/wikiVideoAccess";
import type { WikiVideoCreateRequest } from "@/gateways/wiki/wikiVideoCreate";
import { WikiVideoCreateForm } from ".";

export function WikiVideoCreateEntry(
  props: Pick<WikiVideoCreateRequest, "wikiIdentifier" | "resourceType">,
) {
  const identity = useAuthStore((state) => state.identity);
  const status = useAuthStore((state) => state.status);
  const version = useAuthStore((state) => state.sessionVersion);
  const key = [
    "wiki-video-create-access",
    props.resourceType,
    identity?.identityIdentifier,
    identity?.accountIdentifier,
    identity?.accountPrincipalIdentifier,
    version,
    status,
  ];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchWikiVideoAccess(props.resourceType, signal),
    enabled: status !== "guest",
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  if (status === "guest" || !query.isFetchedAfterMount || query.data !== true)
    return null;
  return (
    <WikiVideoCreateForm
      key={`${props.wikiIdentifier}:${key.join(":")}`}
      {...props}
    />
  );
}
