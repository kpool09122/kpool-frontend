import { WikiDetailPage } from "../../[slug]/WikiDetailPage";
import { loadPublicWikiState } from "@/gateways/wiki/publicWiki";
import type { Metadata } from "next";
import { siteTitle } from "@/app/metadata";

type WikiDetailRouteProps = {
  params: Promise<{
    language: string;
    slug: string;
  }>;
  searchParams: Promise<{
    themeColor?: string | string[];
  }>;
};

const getThemeColor = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export async function generateMetadata({ params }: Pick<WikiDetailRouteProps, "params">): Promise<Metadata> {
  const { language, slug } = await params;
  const wikiState = await loadPublicWikiState(language, slug);

  if (wikiState.status !== "success") {
    return {
      title: siteTitle,
    };
  }

  const wiki = wikiState.data;
  const title = wiki.title ?? wiki.basic.name;

  return {
    title: `${title} | ${siteTitle}`,
    description: wiki.metaDescription ?? undefined,
    keywords: wiki.keywords ?? undefined,
  };
}

export default async function Page({ params, searchParams }: WikiDetailRouteProps) {
  const { language, slug } = await params;
  const { themeColor } = await searchParams;
  const wikiState = await loadPublicWikiState(language, slug);

  return (
    <WikiDetailPage
      language={language}
      slug={slug}
      themeColor={getThemeColor(themeColor)}
      wikiState={wikiState}
    />
  );
}
