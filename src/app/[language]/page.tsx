import type { CSSProperties } from "react";
import Link from "next/link";

import { dictionaries, type I18nDictionary } from "../../i18n/dictionaries";
import { fallbackLocale, normalizeLocale, type Locale } from "../../i18n/locales";
import {
  loadPublicWikiListState,
  type PublicWikiListItem,
  type PublicWikiListQuery,
  type PublicWikiListState,
} from "@/gateways/wiki/publicWiki";
import { buildWikiPath, wikiResourceTypes, type WikiResourceType } from "@kpool/wiki";
import { AutoSubmitSelect } from "./AutoSubmitSelect";
import { buildWikiThemeCssVariables } from "../wiki/[slug]/wikiThemePalette";
import { toResourceType } from "./wikiListQuery";

type LanguageHomeProps = {
  params: Promise<{ language: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type TopSectionKey = "updated" | "created" | "popular";

type TopSection = {
  key: TopSectionKey;
  title: string;
  query: PublicWikiListQuery;
  resourceParamName: `${TopSectionKey}ResourceType`;
  state: PublicWikiListState;
};

type ResourceParamName = TopSection["resourceParamName"];

const sectionResourceParamNames: Record<TopSectionKey, ResourceParamName> = {
  created: "createdResourceType",
  popular: "popularResourceType",
  updated: "updatedResourceType",
};

const getSectionResourceTypes = (
  searchParams: Record<string, string | string[] | undefined>,
): Record<TopSectionKey, WikiResourceType | undefined> => ({
  created: toResourceType(searchParams.createdResourceType),
  popular: toResourceType(searchParams.popularResourceType),
  updated: toResourceType(searchParams.updatedResourceType),
});

const buildListHref = (language: Locale, query: PublicWikiListQuery): string => {
  const params = new URLSearchParams();
  if (query.resourceType) params.set("resourceType", query.resourceType);
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  params.set("perPage", String(query.perPage ?? 10));
  params.set("page", "1");
  return `/${language}/wiki?${params.toString()}`;
};

const formatDate = (value: string | null | undefined, locale: Locale): string =>
  value
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
      }).format(new Date(value))
    : "";

const getWikiCardImageSrc = (item: PublicWikiListItem): string | null => {
  if (item.isHidden === true || item.heroImage?.isHidden === true) {
    return null;
  }

  return item.heroImage?.src ?? item.imageUrl ?? null;
};

const buildSlideCardStyle = (item: PublicWikiListItem): CSSProperties | undefined => {
  const imageSrc = getWikiCardImageSrc(item);

  if (imageSrc) {
    return {
      backgroundColor: "#15243b",
      backgroundImage: `linear-gradient(110deg, rgba(21, 36, 59, 0.92) 0%, rgba(21, 36, 59, 0.72) 54%, rgba(21, 36, 59, 0.32) 100%), url("${imageSrc.replaceAll("\"", "%22")}")`,
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
      className="wiki-theme-scope group flex min-h-56 w-[82vw] max-w-[26rem] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-3xl border border-stroke-subtle bg-surface-raised bg-cover bg-center p-6 transition hover:border-brand-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:w-[24rem]"
      href={buildWikiPath(item.language || locale, item.slug)}
      style={buildSlideCardStyle(item)}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className="rounded-full bg-brand-highlight/70 px-3 py-1 text-xs font-semibold text-text-strong"
          style={{
            backgroundColor: hasHeroImage
              ? "rgba(255, 255, 255, 0.86)"
              : item.themeColor
                ? "var(--wiki-accent-background, rgba(255, 214, 194, 0.7))"
                : undefined,
            color: hasHeroImage ? "#15243b" : item.themeColor ? "var(--wiki-accent-text)" : undefined,
          }}
        >
          {t.resourceLabels[item.resourceType]}
        </span>
      </div>
      <div>
        <h3
          className="text-2xl font-semibold leading-tight text-text-strong"
          style={{ color: hasHeroImage ? "#fffaf4" : undefined }}
        >
          {item.name}
        </h3>
        <p
          className="mt-4 text-sm font-medium text-text-muted"
          style={{ color: hasHeroImage ? "rgba(255, 250, 244, 0.82)" : undefined }}
        >
          {item.updatedAt ? t.updated(formatDate(item.updatedAt, locale)) : t.notPublished}
        </p>
      </div>
    </Link>
  );
};

const Section = ({
  language,
  locale,
  resourceTypes,
  section,
  t,
}: {
  language: Locale;
  locale: Locale;
  resourceTypes: Record<TopSectionKey, WikiResourceType | undefined>;
  section: TopSection;
  t: I18nDictionary["home"];
}) => {
  const data = section.state.status === "success" ? section.state.data.wikis : [];

  return (
    <section className="space-y-4" aria-labelledby={`${section.key}-wiki-heading`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 id={`${section.key}-wiki-heading`} className="text-2xl font-semibold">
          {section.title}
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <form action={`/${language}`} className="flex items-end gap-2">
            {(Object.keys(sectionResourceParamNames) as TopSectionKey[])
              .filter((key) => key !== section.key)
              .map((key) => {
                const resourceType = resourceTypes[key];
                return resourceType ? (
                  <input
                    key={key}
                    name={sectionResourceParamNames[key]}
                    type="hidden"
                    value={resourceType}
                  />
                ) : null;
              })}
            <div className="grid text-sm font-semibold text-text-muted">
              <AutoSubmitSelect
                aria-label={t.resource}
                className="h-10 rounded-lg border border-stroke-subtle bg-surface-base px-3 text-sm text-text-strong outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight"
                defaultValue={section.query.resourceType ?? ""}
                name={section.resourceParamName}
              >
                <option value="">{t.allResources}</option>
                {wikiResourceTypes.map((item) => (
                  <option key={item} value={item}>
                    {t.resourceLabels[item]}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
          </form>
          <Link
            className="pb-2 text-sm font-semibold text-brand-primary transition hover:underline"
            href={buildListHref(language, section.query)}
          >
            {t.more}
          </Link>
        </div>
      </div>
      {section.state.status === "error" ? (
        <p className="rounded-lg border border-stroke-subtle bg-surface-raised p-5 text-sm text-text-muted">
          {section.state.message}
        </p>
      ) : null}
      {section.state.status === "empty" ? (
        <p className="rounded-lg border border-stroke-subtle bg-surface-raised p-5 text-sm text-text-muted">
          {t.emptyMessage}
        </p>
      ) : null}
      {data.length > 0 ? (
        <div className="overflow-x-auto bg-transparent py-2">
          <div className="flex snap-x snap-mandatory gap-4">
            {data.map((item) => (
              <TopWikiSlide key={item.wikiIdentifier} item={item} locale={locale} t={t} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default async function LanguageHome({ params, searchParams }: LanguageHomeProps) {
  const { language } = await params;
  const resolvedLanguage = normalizeLocale(language) ?? fallbackLocale;
  const resolvedSearchParams = (await searchParams) ?? {};
  const resourceTypes = getSectionResourceTypes(resolvedSearchParams);
  const t = dictionaries[resolvedLanguage].home;
  const queries = {
    updated: {
      perPage: 10,
      page: 1,
      sort: "updatedAt" as const,
      order: "desc" as const,
      resourceType: resourceTypes.updated,
    },
    created: {
      perPage: 10,
      page: 1,
      sort: "createdAt" as const,
      order: "desc" as const,
      resourceType: resourceTypes.created,
    },
    popular: {
      perPage: 10,
      page: 1,
      sort: "version" as const,
      order: "desc" as const,
      resourceType: resourceTypes.popular,
    },
  };
  const [updatedState, createdState, popularState] = await Promise.all([
    loadPublicWikiListState(resolvedLanguage, queries.updated),
    loadPublicWikiListState(resolvedLanguage, queries.created),
    loadPublicWikiListState(resolvedLanguage, queries.popular),
  ]);
  const sections: TopSection[] = [
    {
      key: "updated",
      title: t.recentlyUpdatedTitle,
      query: queries.updated,
      resourceParamName: sectionResourceParamNames.updated,
      state: updatedState,
    },
    {
      key: "created",
      title: t.newWikisTitle,
      query: queries.created,
      resourceParamName: sectionResourceParamNames.created,
      state: createdState,
    },
    {
      key: "popular",
      title: t.popularWikisTitle,
      query: queries.popular,
      resourceParamName: sectionResourceParamNames.popular,
      state: popularState,
    },
  ];

  return (
    <main className="min-h-screen bg-surface-base px-6 py-8 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        {sections.map((section) => (
          <Section
            key={section.key}
            language={resolvedLanguage}
            locale={resolvedLanguage}
            resourceTypes={resourceTypes}
            section={section}
            t={t}
          />
        ))}
      </div>
    </main>
  );
}
