import { WikiDetailPage } from "../../../[slug]/WikiDetailPage";
import { loadPublicWikiRouteState } from "../../../publicWikiRoute";
import type { Metadata } from "next";
import { buildWikiDescription, siteTitle } from "@/app/metadata";
import { buildWikiPath } from "@kpool/wiki";
import { getPublicSiteOrigin } from "@/config/publicSite";

type WikiDetailRouteProps = {
  params: Promise<{
    language: string;
    slug: string;
  }>;
  searchParams: Promise<{
    themeColor?: string | string[];
    edit?: string | string[];
  }>;
};

const getThemeColor = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export async function generateMetadata({ params }: Pick<WikiDetailRouteProps, "params">): Promise<Metadata> {
  const { language, slug } = await params;
  const wikiState = await loadPublicWikiRouteState(language, slug);

  if (wikiState.status !== "success") {
    return { title: siteTitle };
  }

  const wiki = wikiState.data;
  const title = wiki.title ?? wiki.basic.name;
  const origin = getPublicSiteOrigin();

  return {
    title: `${title} | ${siteTitle}`,
    description: wiki.metaDescription?.trim() || buildWikiDescription(language, wiki.basic.name),
    keywords: wiki.keywords ?? undefined,
    ...(origin ? { alternates: { canonical: `${origin}${buildWikiPath(language, wiki.slug)}` } } : {}),
  };
}

export default async function Page({ params, searchParams }: WikiDetailRouteProps) {
  const { language, slug } = await params;
  const { themeColor, edit } = await searchParams;
  const wikiState = await loadPublicWikiRouteState(language, slug);

  return (
    <WikiDetailPage
      language={language}
      slug={slug}
      themeColor={getThemeColor(themeColor)}
      wikiState={wikiState}
      resumeEditing={getThemeColor(edit) === "1"}
    />
  );
}
