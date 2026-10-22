"use client";

import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { isSafeWikiSourceUrl, type WikiDetail } from "@kpool/wiki";
import { useI18n } from "@/i18n/I18nProvider";

export function WikiImageSourceLink({ image }: { image: WikiDetail["heroImage"] }) {
  const { dictionary } = useI18n();
  if (image.isHidden || !image.sourceUrl || !isSafeWikiSourceUrl(image.sourceUrl)) return null;

  const sourceUrl = image.sourceUrl.trim();
  const sourceName = image.sourceName?.trim() || new URL(sourceUrl).hostname;

  return (
    <p className="min-w-0 text-center text-xs text-text-muted">
      {dictionary.wiki.heroCard.imageSource}:{" "}
      <a
        className="inline-flex max-w-full items-center gap-1 align-bottom underline underline-offset-4 hover:text-text-strong"
        href={sourceUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{sourceName}</span>
        <ExternalLinkIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
      </a>
    </p>
  );
}
