import { cookies } from "next/headers";

import { loadDraftWikiDiffState } from "@/gateways/wiki/draftWiki";
import { WikiDiffPage } from "../../[slug]/WikiDiffPage";
import { wikiResourceTypes, type WikiResourceType } from "@kpool/wiki";

type WikiDiffRouteProps = {
  params: Promise<{
    wikiId: string;
  }>;
  searchParams: Promise<{
    resourceType?: string | string[];
    themeColor?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getSingleSearchParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const isWikiResourceType = (value: string | undefined): value is WikiResourceType =>
  value !== undefined && wikiResourceTypes.includes(value as WikiResourceType);

export default async function Page({ params, searchParams }: WikiDiffRouteProps) {
  const { wikiId } = await params;
  const { resourceType, themeColor } = await searchParams;
  const normalizedResourceType = getSingleSearchParam(resourceType);

  if (!isWikiResourceType(normalizedResourceType)) {
    return (
      <WikiDiffPage
        draftWikiState={{
          status: "error",
          message: "Draft wiki resource type is required.",
        }}
        language=""
        publicWikiState={{
          status: "error",
          message: "Draft wiki resource type is required.",
        }}
        themeColor={getSingleSearchParam(themeColor)}
      />
    );
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const wikiApiHeaders = cookieHeader ? { Cookie: cookieHeader } : undefined;
  const diffState = wikiApiHeaders
    ? await loadDraftWikiDiffState(normalizedResourceType, wikiId, wikiApiHeaders)
    : await loadDraftWikiDiffState(normalizedResourceType, wikiId);

  return (
    <WikiDiffPage
      draftWikiState={diffState.draftWikiState}
      language={diffState.language}
      publicWikiState={diffState.publicWikiState}
      themeColor={getSingleSearchParam(themeColor)}
    />
  );
}
