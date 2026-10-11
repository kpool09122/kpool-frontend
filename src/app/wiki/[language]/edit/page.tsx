import { redirect } from "next/navigation";
import { buildWikiDraftEditPath, isWikiResourceType } from "@kpool/wiki";

import { loadDraftWikiStateByIdentifier } from "@/gateways/wiki/draftWiki";
import { loadWikiEditAccess } from "../../wikiEditAccess";
import { WikiEditPage } from "../../[slug]/edit/WikiEditPage";

type WikiDraftEditRouteProps = {
  // This segment is shared with /wiki/:language/:slug; here it contains the draft ID.
  params: Promise<{ language: string }>;
  searchParams: Promise<{
    resourceType?: string | string[];
    themeColor?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const singleValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function Page({ params, searchParams }: WikiDraftEditRouteProps) {
  const { language: wikiDraftId } = await params;
  const query = await searchParams;
  const resourceType = singleValue(query.resourceType);
  const themeColor = singleValue(query.themeColor);
  const returnPath = buildWikiDraftEditPath(wikiDraftId, resourceType ?? "", themeColor);
  const access = await loadWikiEditAccess(returnPath);
  if (access.status === "redirect") redirect(access.href);

  const wikiState = access.status === "error"
    ? access
    : resourceType && isWikiResourceType(resourceType)
      ? await loadDraftWikiStateByIdentifier(resourceType, wikiDraftId, access.headers)
      : { status: "error" as const, message: "Draft wiki resource type is required." };

  return (
    <WikiEditPage
      language={wikiState.status === "success" ? wikiState.data.language : ""}
      slug={wikiState.status === "success" ? wikiState.data.slug : ""}
      themeColor={themeColor}
      wikiState={wikiState}
    />
  );
}
