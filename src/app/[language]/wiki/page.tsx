import Link from "next/link";

import { dictionaries, type I18nDictionary } from "../../../i18n/dictionaries";
import { normalizeLocale, fallbackLocale, type Locale } from "../../../i18n/locales";
import {
  loadPublicWikiListState,
  type PublicWikiListQuery,
  type PublicWikiListState,
} from "@/gateways/wiki/publicWiki";
import {
  wikiResourceTypes,
} from "@kpool/wiki";
import { AutoSubmitSelect } from "../AutoSubmitSelect";
import { PublicWikiCard } from "../WikiListCard";
import { firstQueryValue, toResourceType } from "../wikiListQuery";

type WikiListPageProps = {
  params: Promise<{ language: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const pageSizes = [10, 30, 50] as const;
const defaultQuery = {
  order: "asc" as const,
  page: 1,
  perPage: 10,
  sort: "name" as const,
};

const toPositiveInteger = (
  value: string | string[] | undefined,
  fallback: number,
): number => {
  const parsedValue = Number(firstQueryValue(value));

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const toPageSize = (value: string | string[] | undefined): number => {
  const parsedValue = toPositiveInteger(value, defaultQuery.perPage);

  return pageSizes.includes(parsedValue as (typeof pageSizes)[number])
    ? parsedValue
    : defaultQuery.perPage;
};

const toOrder = (value: string | string[] | undefined): "asc" | "desc" =>
  firstQueryValue(value) === "desc" ? "desc" : defaultQuery.order;

const toKeyword = (value: string | string[] | undefined): string | undefined => {
  const keyword = firstQueryValue(value)?.trim();

  return keyword ? keyword : undefined;
};

const buildListQuery = (
  searchParams: Record<string, string | string[] | undefined>,
): PublicWikiListQuery => ({
  keyword: toKeyword(searchParams.keyword),
  order: toOrder(searchParams.order),
  page: toPositiveInteger(searchParams.page, defaultQuery.page),
  perPage: toPageSize(searchParams.perPage),
  resourceType: toResourceType(searchParams.resourceType),
  sort: defaultQuery.sort,
});

const buildHref = (
  language: string,
  query: PublicWikiListQuery,
  overrides: PublicWikiListQuery,
): string => {
  const params = new URLSearchParams();
  const nextQuery = {
    ...query,
    ...overrides,
  };

  if (nextQuery.keyword) {
    params.set("keyword", nextQuery.keyword);
  }
  if (nextQuery.resourceType) {
    params.set("resourceType", nextQuery.resourceType);
  }
  params.set("sort", defaultQuery.sort);
  params.set("order", nextQuery.order ?? defaultQuery.order);
  params.set("perPage", String(nextQuery.perPage ?? defaultQuery.perPage));
  params.set("page", String(nextQuery.page ?? defaultQuery.page));

  return `/${encodeURIComponent(language)}/wiki?${params.toString()}`;
};

const getPaginationPages = (currentPage: number, lastPage: number): number[] => {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(lastPage, currentPage + 2);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const StatePanel = ({
  message,
  title,
}: {
  message: string;
  title: string;
}) => (
  <div className="rounded-lg border border-stroke-subtle bg-surface-raised p-8 text-center shadow-soft">
    <h2 className="text-2xl font-semibold text-text-strong">{title}</h2>
    <p className="mt-3 text-sm leading-6 text-text-muted">{message}</p>
  </div>
);

const WikiListContent = ({
  query,
  locale,
  resolvedLanguage,
  state,
  t,
}: {
  query: PublicWikiListQuery;
  locale: Locale;
  resolvedLanguage: string;
  state: PublicWikiListState;
  t: I18nDictionary["home"];
}) => {
  if (state.status === "loading") {
    return (
      <StatePanel
        title={t.loadingTitle}
        message={t.loadingMessage}
      />
    );
  }

  if (state.status === "error") {
    return <StatePanel title={t.errorTitle} message={state.message} />;
  }

  if (state.status === "empty") {
    return (
      <StatePanel
        title={t.emptyTitle}
        message={t.emptyMessage}
      />
    );
  }

  const { data } = state;
  const currentPage = data.currentPage;
  const lastPage = Math.max(1, data.lastPage);

  return (
    <section aria-labelledby="wiki-list-heading" className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="wiki-list-heading" className="text-2xl font-semibold">
            {t.listTitle}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {t.listSummary(data.total, currentPage, lastPage)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.wikis.map((item) => (
          <PublicWikiCard
            key={item.wikiIdentifier}
            item={item}
            locale={locale}
            resolvedLanguage={resolvedLanguage}
            t={t}
          />
        ))}
      </div>

      <nav
        aria-label={t.pagination}
        className="flex flex-wrap items-center justify-center gap-2 pt-2"
      >
        {currentPage > 1 ? (
          <Link
            className="rounded-lg border border-stroke-subtle bg-surface-raised px-4 py-2 text-sm font-semibold"
            href={buildHref(resolvedLanguage, query, { page: currentPage - 1 })}
          >
            {t.previous}
          </Link>
        ) : null}
        {getPaginationPages(currentPage, lastPage).map((page) => (
          <Link
            key={page}
            aria-current={page === currentPage ? "page" : undefined}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              page === currentPage
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-stroke-subtle bg-surface-raised text-text-strong"
            }`}
            href={buildHref(resolvedLanguage, query, { page })}
          >
            {page}
          </Link>
        ))}
        {currentPage < lastPage ? (
          <Link
            className="rounded-lg border border-stroke-subtle bg-surface-raised px-4 py-2 text-sm font-semibold"
            href={buildHref(resolvedLanguage, query, { page: currentPage + 1 })}
          >
            {t.next}
          </Link>
        ) : null}
      </nav>
    </section>
  );
};

export default async function WikiListPage({ params, searchParams }: WikiListPageProps) {
  const { language } = await params;
  const resolvedLanguage = normalizeLocale(language) ?? fallbackLocale;
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = buildListQuery(resolvedSearchParams);
  const t = dictionaries[resolvedLanguage].home;
  const state = await loadPublicWikiListState(resolvedLanguage, query);

  return (
    <main className="min-h-screen bg-surface-base px-6 py-8 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase text-text-muted">
            {t.eyebrow}
          </p>
          <h1 className="text-4xl font-semibold text-text-strong sm:text-5xl">
            {t.title}
          </h1>
        </header>

        <form
          action={`/${resolvedLanguage}/wiki`}
          className="grid gap-4 rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_10rem]"
        >
          <input type="hidden" name="sort" value="name" />
          <label className="grid gap-2 text-sm font-semibold text-text-muted">
            {t.search}
            <input
              className="h-11 rounded-lg border border-stroke-subtle bg-surface-base px-3 text-sm text-text-strong outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight"
              defaultValue={query.keyword ?? ""}
              name="keyword"
              placeholder={t.searchPlaceholder}
              type="search"
            />
          </label>
          <label className="grid text-sm font-semibold text-text-muted">
            <span className="sr-only">{t.resource}</span>
            <AutoSubmitSelect
              className="h-11 rounded-lg border border-stroke-subtle bg-surface-base px-3 text-sm text-text-strong outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight"
              defaultValue={query.resourceType ?? ""}
              name="resourceType"
            >
              <option value="">{t.allResources}</option>
              {wikiResourceTypes.map((resourceType) => (
                <option key={resourceType} value={resourceType}>
                  {t.resourceLabels[resourceType]}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-muted">
            {t.sort}
            <AutoSubmitSelect
              className="h-11 rounded-lg border border-stroke-subtle bg-surface-base px-3 text-sm text-text-strong outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight"
              defaultValue={query.order ?? defaultQuery.order}
              name="order"
            >
              <option value="asc">{t.sortAsc}</option>
              <option value="desc">{t.sortDesc}</option>
            </AutoSubmitSelect>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-muted">
            {t.perPage}
            <AutoSubmitSelect
              className="h-11 rounded-lg border border-stroke-subtle bg-surface-base px-3 text-sm text-text-strong outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight"
              defaultValue={query.perPage ?? defaultQuery.perPage}
              name="perPage"
            >
              {pageSizes.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>
        </form>

        <WikiListContent
          query={query}
          locale={resolvedLanguage}
          resolvedLanguage={resolvedLanguage}
          state={state}
          t={t}
        />
      </div>
    </main>
  );
}
