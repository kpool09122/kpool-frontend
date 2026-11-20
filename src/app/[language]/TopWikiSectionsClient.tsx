"use client";

import { HorizontalCarousel } from "@/components/HorizontalCarousel";
import { wikiCarouselCopy } from "@/i18n/wikiCarousel";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useState } from "react";
import Link from "next/link";

import { dictionaries, type I18nDictionary } from "../../i18n/dictionaries";
import type { Locale } from "../../i18n/locales";
import {
  type PublicWikiListItem,
  type PublicWikiListQuery,
  type PublicWikiListState,
} from "@/gateways/wiki/publicWiki";
import { buildWikiPath, wikiResourceTypes, type WikiResourceType } from "@kpool/wiki";
import { buildWikiThemeCssVariables } from "../wiki/[slug]/wikiThemePalette";
import { OfficialCertificationBadge } from "@/components/Wiki/OfficialCertificationBadge";

export type TopSectionKey = "updated" | "created";

export type TopSection = {
  key: TopSectionKey;
  title: string;
  query: PublicWikiListQuery;
  resourceParamName: `${TopSectionKey}ResourceType`;
  state: PublicWikiListState;
};

const buildListHref = (language: Locale, query: PublicWikiListQuery): string => {
  const params = new URLSearchParams();
  if (query.resourceType) params.set("resourceType", query.resourceType);
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  params.set("perPage", String(query.perPage ?? 10));
  params.set("page", "1");
  return `/${language}/wiki?${params.toString()}`;
};

const getWikiCardImageSrc = (item: PublicWikiListItem): string | null => {
  if (item.isHidden === true || item.heroImage?.isHidden === true) {
    return null;
  }

  return item.heroImage?.src ?? item.imageUrl ?? null;
};

const buildSlideCardStyle = (item: PublicWikiListItem): CSSProperties | undefined => {
  const imageSrc = getWikiCardImageSrc(item);
  const themeVariables = buildWikiThemeCssVariables(item.themeColor, item.fontStyle);

  if (imageSrc) {
    return {
      ...themeVariables,
      backgroundColor: "#15243b",
      backgroundImage: `linear-gradient(110deg, rgba(21, 36, 59, 0.92) 0%, rgba(21, 36, 59, 0.72) 54%, rgba(21, 36, 59, 0.32) 100%), url("${imageSrc.replaceAll("\"", "%22")}")`,
      borderColor: "rgba(255, 255, 255, 0.22)",
    };
  }

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

const TopWikiSlide = ({
  item,
  locale,
  t,
}: {
  item: PublicWikiListItem;
  locale: Locale;
  t: I18nDictionary["home"];
}) => {
  const hasHeroImage = Boolean(getWikiCardImageSrc(item));

  return (
    <Link
      className="wiki-theme-scope group flex h-full min-h-56 w-full flex-col justify-between overflow-hidden rounded-3xl border border-stroke-subtle bg-surface-raised bg-cover bg-center p-6 transition hover:border-brand-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      href={buildWikiPath(item.language || locale, item.slug)}
      style={buildSlideCardStyle(item)}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className="rounded-full bg-brand-highlight/70 px-3 py-1 text-xs font-semibold text-text-strong"
          style={{
            backgroundColor: hasHeroImage
              ? "var(--wiki-card-background-muted-light, rgba(255, 255, 255, 0.86))"
              : item.themeColor
                ? "var(--wiki-card-background-muted, var(--surface-base))"
                : undefined,
            color: hasHeroImage ? "var(--wiki-title-text-light, #15243b)" : item.themeColor ? "var(--wiki-title-text, var(--text-strong))" : undefined,
          }}
        >
          {t.resourceLabels[item.resourceType]}
        </span>
      </div>
      <div>
        <h3
          className="wiki-title flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-semibold leading-tight"
          style={{ color: hasHeroImage ? "var(--wiki-title-text-dark, #fffaf4)" : undefined }}
        >
          <span>{item.name}</span>
          {item.isOfficial === true ? <OfficialCertificationBadge /> : null}
        </h3>
        <p
          className="mt-4 text-sm font-medium text-text-muted"
          style={{ color: hasHeroImage ? "rgba(255, 250, 244, 0.82)" : undefined }}
        >
          {item.updatedAt ? <LocalizedDateTime value={item.updatedAt} locale={locale} dateOnly template={t.updated("{date}")} /> : t.notPublished}
        </p>
      </div>
    </Link>
  );
};

const buildSectionApiPath = (language: Locale, query: PublicWikiListQuery): string => {
  const params = new URLSearchParams();
  params.set("language", language);
  if (query.resourceType) params.set("resourceType", query.resourceType);
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  params.set("perPage", String(query.perPage ?? 10));
  params.set("page", String(query.page ?? 1));
  return `/api/wiki/public-wikis?${params.toString()}`;
};

const updateCurrentUrl = (
  language: Locale,
  sections: TopSection[],
  targetKey: TopSectionKey,
  resourceType: WikiResourceType | undefined,
) => {
  const params = new URLSearchParams(window.location.search);

  for (const section of sections) {
    const value = section.key === targetKey ? resourceType : section.query.resourceType;

    if (value) {
      params.set(section.resourceParamName, value);
    } else {
      params.delete(section.resourceParamName);
    }
  }

  const queryString = params.toString();
  window.history.replaceState(null, "", `/${language}${queryString ? `?${queryString}` : ""}`);
};

const Section = ({
  language,
  locale,
  section,
  sections,
  setSections,
  t,
}: {
  language: Locale;
  locale: Locale;
  section: TopSection;
  sections: TopSection[];
  setSections: Dispatch<SetStateAction<TopSection[]>>;
  t: I18nDictionary["home"];
}) => {
  const data = section.state.status === "success" ? section.state.data.wikis : [];

  const changeResourceType = async (value: string) => {
    const resourceType = wikiResourceTypes.find((item) => item === value);
    const nextQuery = {
      ...section.query,
      resourceType,
    };

    setSections((current) =>
      current.map((item) =>
        item.key === section.key
          ? {
              ...item,
              query: nextQuery,
              state: { status: "loading" },
            }
          : item,
      ),
    );
    updateCurrentUrl(language, sections, section.key, resourceType);

    await fetch(buildSectionApiPath(language, nextQuery), {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const body = await response.json();
        const nextState: PublicWikiListState = response.ok
          ? (body as PublicWikiListState)
          : { status: "error", message: (body as { message?: string }).message ?? t.errorTitle };

        setSections((current) =>
          current.map((item) =>
            item.key === section.key
              ? {
                  ...item,
                  state: nextState,
                }
              : item,
          ),
        );
      })
      .catch(() => {
        setSections((current) =>
          current.map((item) =>
            item.key === section.key
              ? {
                  ...item,
                  state: { status: "error", message: t.errorTitle },
                }
              : item,
          ),
        );
      });
  };

  const carousel = wikiCarouselCopy[locale];
  return (
    <HorizontalCarousel
      title={section.title}
      paginationLabel={carousel.pagination}
      slideLabel={carousel.slide}
      direction={section.key === "updated" ? "rtl" : "ltr"}
      itemClassName="basis-[calc(82vw+1rem)] max-w-[27rem] sm:basis-[25rem]"
      headerActions={
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid text-sm font-semibold text-text-muted">
            <select
              aria-label={t.resource}
              className="h-10 rounded-lg border border-stroke-subtle bg-surface-base px-3 text-sm text-text-strong outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight"
              onChange={(event) => void changeResourceType(event.currentTarget.value)}
              value={section.query.resourceType ?? ""}
            >
              <option value="">{t.allResources}</option>
              {wikiResourceTypes.map((item) => (
                <option key={item} value={item}>
                  {t.resourceLabels[item]}
                </option>
              ))}
            </select>
          </div>
          <Link
            className="pb-2 text-sm font-semibold text-brand-primary transition hover:underline"
            href={buildListHref(language, section.query)}
          >
            {t.more}
          </Link>
        </div>
      }
      emptyState={
        <p className="rounded-lg border border-stroke-subtle bg-surface-raised p-5 text-sm text-text-muted">
          {section.state.status === "loading" ? t.loadingMessage
            : section.state.status === "error" ? section.state.message
            : t.emptyMessage}
        </p>
      }
    >
      {data.map((item) => (
        <TopWikiSlide key={item.wikiIdentifier} item={item} locale={locale} t={t} />
      ))}
    </HorizontalCarousel>
  );
};

export const TopWikiSectionsClient = ({
  initialSections,
  language,
  locale,
}: {
  initialSections: TopSection[];
  language: Locale;
  locale: Locale;
}) => {
  const [sections, setSections] = useState(initialSections);
  const t = dictionaries[locale].home;

  return (
    <>
      {sections.map((section) => (
        <Section
          key={section.key}
          language={language}
          locale={locale}
          section={section}
          sections={sections}
          setSections={setSections}
          t={t}
        />
      ))}
    </>
  );
};
