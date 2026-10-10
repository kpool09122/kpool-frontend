"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { WikiStatePanel } from "@/components/Wiki";
import { createWiki } from "@/gateways/wiki/draftWiki";
import { useI18n } from "@/i18n/I18nProvider";

type WikiDraftInitializerProps = {
  requestBody: Parameters<typeof createWiki>[0]["requestBody"];
  createAdapter?: typeof createWiki;
};

export function WikiDraftInitializer({
  requestBody,
  createAdapter = createWiki,
}: WikiDraftInitializerProps) {
  const router = useRouter();
  const { dictionary } = useI18n();
  const t = dictionary.wiki;
  const creation = useRef<ReturnType<typeof createWiki> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Reuse the request when Strict Mode runs the effect again.
    creation.current ??= createAdapter({ requestBody, fallbackErrorMessage: t.loadErrorTitle });
    void creation.current
      .then(() => {
        if (active) router.refresh();
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : t.loadErrorTitle);
      });
    return () => {
      active = false;
    };
  }, [createAdapter, requestBody, router, t.loadErrorTitle]);

  return (
    <WikiStatePanel
      title={errorMessage ? t.loadErrorTitle : t.loadingTitle}
      message={errorMessage ?? t.preparingEditMessage}
      tone={errorMessage ? "danger" : "default"}
    />
  );
}
