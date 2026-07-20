import { dictionaries } from "../../i18n/dictionaries";
import { fallbackLocale, normalizeLocale } from "../../i18n/locales";
import { loadPublicWikiListState } from "@/gateways/wiki/publicWiki";
import type { WikiResourceType } from "@kpool/wiki";
import { TopWikiSectionsClient, type TopSection, type TopSectionKey } from "./TopWikiSectionsClient";
import { toResourceType } from "./wikiListQuery";

type LanguageHomeProps = {
  params: Promise<{ language: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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
        <TopWikiSectionsClient
          initialSections={sections}
          language={resolvedLanguage}
          locale={resolvedLanguage}
        />
      </div>
    </main>
  );
}
