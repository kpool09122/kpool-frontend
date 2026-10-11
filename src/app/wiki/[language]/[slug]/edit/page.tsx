import { redirect } from "next/navigation";

import { loadDraftWikiState } from "@/gateways/wiki/draftWiki";
import { WikiEditPage } from "../../../[slug]/edit/WikiEditPage";
import { buildWikiDraftEditPath, buildWikiEditEntryPath } from "@kpool/wiki";

import { loadWikiEditAccess } from "../../../wikiEditAccess";

type WikiEditRouteProps = {
  params: Promise<{
    language: string;
    slug: string;
  }>;
  searchParams: Promise<{
    themeColor?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getSingleSearchParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function Page({ params, searchParams }: WikiEditRouteProps) {
  const { language, slug } = await params;
  const { themeColor } = await searchParams;
  const normalizedThemeColor = getSingleSearchParam(themeColor);
  const editReturnPath = buildWikiEditEntryPath(language, slug, normalizedThemeColor);
  const access = await loadWikiEditAccess(editReturnPath);
  if (access.status === "redirect") redirect(access.href);
  const wikiState = access.status === "error"
    ? access
    : access.headers
      ? await loadDraftWikiState(language, slug, access.headers)
      : await loadDraftWikiState(language, slug);

  if (wikiState.status === "success") {
    redirect(buildWikiDraftEditPath(wikiState.data.wikiIdentifier, wikiState.data.resourceType, normalizedThemeColor));
  }

  return (
    <WikiEditPage
      language={language}
      slug={slug}
      themeColor={normalizedThemeColor}
      wikiState={wikiState}
    />
  );
}
