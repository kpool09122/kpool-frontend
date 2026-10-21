"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildWikiMaterialSearchContext,
  type WikiDraftDetail,
} from "@kpool/wiki";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import {
  canSearchWikiFreeMaterials,
  getCurrentWikiPrincipal,
  type WikiPrincipalState,
} from "@/gateways/wiki/wikiPrincipal";
import {
  materialSearchRequestSchema,
  searchWikiFreeMaterials,
} from "@/gateways/wiki/wikiMaterialSearch";
import { fetchWikiRelatedProfiles } from "@/gateways/wiki/wikiRelatedProfilesBrowserApi";
import { useI18n } from "@/i18n/I18nProvider";
import { normalizeLocale } from "@/i18n/locales";
import type { WikiMaterialSearchController } from "@/components/Wiki/WikiImageLibrary/types";

export function useWikiMaterialSearch(
  draft: WikiDraftDetail,
  isOpen: boolean,
  readDraft: () => WikiDraftDetail,
  initialIdentity?: AuthenticatedIdentitySummary | null,
) {
  const storedIdentity = useAuthStore((state) => state.identity);
  const authStatus = useAuthStore((state) => state.status);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const identity =
    storedIdentity ??
    (authStatus === "loading" && sessionVersion === 0 ? initialIdentity : null);
  const { locale, dictionary } = useI18n();
  const words = dictionary.wiki.imageLibrary.materialSearch;
  const [principalState, setPrincipalState] = useState<WikiPrincipalState>({
    status: "idle",
  });
  const [result, setResult] =
    useState<WikiMaterialSearchController["result"]>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (!isOpen || !identity) return;
    let current = true;
    void getCurrentWikiPrincipal().then((state) => {
      if (current) setPrincipalState(state);
    });
    return () => {
      current = false;
    };
  }, [identity, isOpen]);
  const language = normalizeLocale(identity?.language) ?? locale;
  const [previewContext, setPreviewContext] = useState<
    WikiMaterialSearchController["context"] | null
  >(null);
  const context =
    previewContext ?? buildWikiMaterialSearchContext(draft, language);
  const prepareContext = () =>
    setPreviewContext(buildWikiMaterialSearchContext(readDraft(), language));
  const allowed = Boolean(
    identity &&
      principalState.status === "available" &&
      canSearchWikiFreeMaterials(principalState.principal),
  );
  const search = () => {
    if (!allowed || pending.current) return;
    const context = buildWikiMaterialSearchContext(readDraft(), language);
    setPreviewContext(context);
    if (!context.title?.trim() && !context.displayName?.trim()) {
      setError(words.titleRequired);
      return;
    }
    pending.current = true;
    const current = generation.current;
    setIsSearching(true);
    setError(null);
    const completeContext = context.relatedWikis.some((wiki) => !wiki.title)
      ? fetchWikiRelatedProfiles({
          language: draft.language,
          resourceType: draft.resourceType,
          slug: draft.slug,
          fallbackErrorMessage: words.contextFailed,
        }).then(({ profiles }) => ({
          ...context,
          relatedWikis: context.relatedWikis.map((wiki) => ({
            ...wiki,
            title:
              wiki.title ||
              profiles.find(
                (profile) =>
                  profile.wikiIdentifier === wiki.identifier &&
                  profile.resourceType === wiki.resourceType,
              )?.name ||
              "",
          })),
        }))
      : Promise.resolve(context);
    void completeContext
      .then((input) => {
        if (current !== generation.current) return;
        const valid = materialSearchRequestSchema.safeParse(input);
        if (!valid.success)
          return Promise.reject(new Error(words.contextFailed));
        return searchWikiFreeMaterials(valid.data, words.failed).then(
          ({ sites }) => {
            if (current === generation.current)
              setResult({ context: valid.data, sites });
          },
        );
      })
      .catch(() => {
        if (current === generation.current) setError(words.failed);
      })
      .finally(() => {
        pending.current = false;
        if (current === generation.current) setIsSearching(false);
      });
  };
  return {
    prepareContext,
    controller: allowed
      ? { context, result, isSearching, error, onSearch: search }
      : undefined,
    hasRetainedResults: Boolean(result?.sites.length),
  };
}
