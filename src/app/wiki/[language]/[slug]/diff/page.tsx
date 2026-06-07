import { cookies } from "next/headers";

import { loadDraftWikiState } from "@/gateways/wiki/draftWiki";
import { loadPublicWikiState } from "@/gateways/wiki/publicWiki";
import { WikiDiffPage } from "../../../[slug]/WikiDiffPage";

type WikiDiffRouteProps = {
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

const getThemeColor = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function Page({ params, searchParams }: WikiDiffRouteProps) {
  const { language, slug } = await params;
  const { themeColor } = await searchParams;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const wikiApiHeaders = cookieHeader ? { Cookie: cookieHeader } : undefined;
  const [publicWikiState, draftWikiState] = await Promise.all([
    loadPublicWikiState(language, slug),
    wikiApiHeaders
      ? loadDraftWikiState(language, slug, wikiApiHeaders)
      : loadDraftWikiState(language, slug),
  ]);

  return (
    <WikiDiffPage
      draftWikiState={draftWikiState}
      language={language}
      publicWikiState={publicWikiState}
      themeColor={getThemeColor(themeColor)}
    />
  );
}
