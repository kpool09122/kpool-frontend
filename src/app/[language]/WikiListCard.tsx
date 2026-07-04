import type { CSSProperties } from "react";
import Link from "next/link";

import type { I18nDictionary } from "../../i18n/dictionaries";
import type { Locale } from "../../i18n/locales";
import type { PublicWikiListItem } from "@/gateways/wiki/publicWiki";
import { buildWikiPath } from "@kpool/wiki";
import { buildWikiThemeCssVariables } from "../wiki/[slug]/wikiThemePalette";

type PublicWikiCardProps = {
  headingLevel?: "h2" | "h3";
  item: PublicWikiListItem;
  locale: Locale;
  minHeightClassName?: "min-h-44" | "min-h-48";
  resolvedLanguage?: string;
  t: I18nDictionary["home"];
};

const formatDate = (value: string | null | undefined, locale: Locale): string =>
  value
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
      }).format(new Date(value))
    : "";

const getWikiCardImageSrc = (item: PublicWikiListItem): string | null =>
  item.heroImage?.src ?? item.imageUrl ?? null;

const buildWikiCardStyle = (
  item: PublicWikiListItem,
): CSSProperties | undefined => {
  const imageSrc = getWikiCardImageSrc(item);

  if (imageSrc) {
    return {
      backgroundColor: "#15243b",
      backgroundImage: `linear-gradient(180deg, rgba(21, 36, 59, 0.78) 0%, rgba(21, 36, 59, 0.68) 48%, rgba(21, 36, 59, 0.9) 100%), url("${imageSrc.replaceAll("\"", "%22")}")`,
      borderColor: "rgba(255, 255, 255, 0.22)",
    };
  }

  const themeVariables = buildWikiThemeCssVariables(item.themeColor);

  if (!themeVariables) {
    return undefined;
  }

  return {
    ...themeVariables,
    backgroundColor: "var(--wiki-card-background, var(--surface-raised))",
    backgroundImage: "var(--wiki-page-background)",
    borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
  };
};

export const PublicWikiCard = ({
  headingLevel = "h2",
  item,
  locale,
  minHeightClassName = "min-h-48",
  resolvedLanguage,
  t,
}: PublicWikiCardProps) => {
  const hasHeroImage = Boolean(getWikiCardImageSrc(item));
  const Heading = headingLevel;

  return (
    <Link
      aria-label={item.name}
      className={`wiki-theme-scope group flex ${minHeightClassName} flex-col justify-between rounded-lg border border-stroke-subtle bg-surface-raised bg-cover bg-center p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-primary/40`}
      href={buildWikiPath(item.language || resolvedLanguage || locale, item.slug)}
      style={buildWikiCardStyle(item)}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full bg-brand-highlight/60 px-3 py-1 text-xs font-semibold text-text-strong"
            style={{
              backgroundColor: hasHeroImage
                ? "rgba(255, 255, 255, 0.86)"
                : item.themeColor
                  ? "var(--wiki-accent-background, rgba(255, 214, 194, 0.6))"
                  : undefined,
              color: hasHeroImage
                ? "#15243b"
                : item.themeColor
                  ? "var(--wiki-accent-text)"
                  : undefined,
            }}
          >
            {t.resourceLabels[item.resourceType]}
          </span>
        </div>
        <Heading
          className="mt-4 text-2xl font-semibold text-text-strong"
          style={{
            color: hasHeroImage ? "#fffaf4" : undefined,
          }}
        >
          {item.name}
        </Heading>
      </div>
      <div
        className="mt-6 flex items-center justify-between gap-4 text-sm text-text-muted"
        style={{
          color: hasHeroImage ? "rgba(255, 250, 244, 0.86)" : undefined,
        }}
      >
        <span>
          {item.updatedAt
            ? t.updated(formatDate(item.updatedAt, locale))
            : t.notPublished}
        </span>
        <span
          className="font-semibold text-brand-primary group-hover:underline"
          style={{
            color: hasHeroImage ? "#fffaf4" : undefined,
          }}
        >
          {t.open}
        </span>
      </div>
    </Link>
  );
};
