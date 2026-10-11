"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

import { resolveWikiEditDestination } from "@/gateways/wiki/draftWiki";
import { useI18n } from "@/i18n/I18nProvider";

export function useWikiEditEntry(
  { language, slug, themeColor }: { language: string; slug: string; themeColor?: string },
  resumeEditing = false,
) {
  const router = useRouter();
  const { dictionary } = useI18n();
  const fallbackErrorMessage = dictionary.wiki.loadErrorTitle;
  const pending = useRef(false);
  const resumedSource = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const beginEditing = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    setIsStarting(true);
    setError(null);
    void resolveWikiEditDestination({ language, slug, themeColor, fallbackErrorMessage })
      .then((href) => router.push(href))
      .catch((error: unknown) => setError(error instanceof Error ? error.message : fallbackErrorMessage))
      .finally(() => { pending.current = false; setIsStarting(false); });
  }, [language, slug, themeColor, fallbackErrorMessage, router]);

  useEffect(() => {
    const source = `${language}:${slug}`;
    if (resumeEditing && resumedSource.current !== source) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("edit") !== "1") return;
      resumedSource.current = source;
      url.searchParams.delete("edit");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      beginEditing();
    }
  }, [resumeEditing, language, slug, beginEditing]);

  const startEditing = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    beginEditing();
  };

  return { error, isStarting, startEditing };
}
