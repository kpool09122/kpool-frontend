"use client";

import { useQuery } from "@tanstack/react-query";
import type { Locale } from "@/i18n/locales";
import { searchPublicWikis } from "./publicWikiSearchBrowserApi";

const waitForInput = (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const abort = () => {
    clearTimeout(timer);
    reject(signal.reason);
  };
  const timer = setTimeout(() => {
    signal.removeEventListener("abort", abort);
    resolve();
  }, 500);
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
});

export function usePublicWikiSearch(language: Locale, input: string, active: boolean) {
  const keyword = active ? input.trim() : "";
  return useQuery({
    queryKey: ["public-wiki-search", language, keyword],
    queryFn: async ({ signal }) => {
      await waitForInput(signal);
      return searchPublicWikis(language, keyword, signal);
    },
    enabled: keyword.length > 0,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
