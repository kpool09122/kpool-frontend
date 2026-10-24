"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/gateways/auth/authStore";
import { fetchWikiVideoAccess } from "@/gateways/wiki/wikiVideoAccess";
import type { WikiVideoCreateRequest } from "@/gateways/wiki/wikiVideoCreate";
import { useI18n } from "@/i18n/I18nProvider";
import { ChevronIcon } from "../icons";
import { WikiVideoCreateForm } from ".";

export function WikiVideoCreateEntry(
  props: Pick<WikiVideoCreateRequest, "wikiIdentifier" | "resourceType"> & {
    onCreated?: () => void;
  },
) {
  const { dictionary } = useI18n();
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
    <details className="section-accordion mb-6 rounded-2xl border border-stroke-subtle">
      <summary className="flex list-none cursor-pointer items-center gap-3 p-4 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
        <span className="section-accordion__chevron rounded-full border border-stroke-subtle p-2 text-text-muted transition-transform">
          <ChevronIcon />
        </span>
        {dictionary.wiki.videos.create.add}
      </summary>
      <div className="border-t border-stroke-subtle p-4">
        <WikiVideoCreateForm
          key={`${props.wikiIdentifier}:${key.join(":")}`}
          {...props}
        />
      </div>
    </details>
  );
}
