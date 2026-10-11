import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buildWikiDraftEditPath, buildWikiEditEntryPath } from "@kpool/wiki";

import { csrfTokenMismatchResponse } from "@/app/api/csrfResponse";
import { loadWikiEditAccess } from "@/app/wiki/wikiEditAccess";
import { createDraftWikiApiClient, loadDraftWikiState } from "@/gateways/wiki/draftWiki";
import { getForwardedWikiApiHeaders, getWikiRouteErrorStatus, jsonErrorResponse, wikiDraftUnavailableMessage } from "../../wikiRouteSupport";

const requestSchema = z.object({
  language: z.string().min(1).max(32),
  slug: z.string().min(1).max(255),
  themeColor: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonErrorResponse("Invalid Wiki edit request.", 400);
  const { language, slug, themeColor } = parsed.data;
  const access = await loadWikiEditAccess(buildWikiEditEntryPath(language, slug, themeColor));
  if (access.status === "redirect") return NextResponse.json({ href: access.href });
  if (access.status === "error") return jsonErrorResponse(wikiDraftUnavailableMessage, 502);

  const headers = getForwardedWikiApiHeaders(request.headers);
  const state = await loadDraftWikiState(language, slug, headers);
  if (state.status === "success") {
    return NextResponse.json({ href: buildWikiDraftEditPath(state.data.wikiIdentifier, state.data.resourceType, themeColor) });
  }
  if (state.status === "empty") return jsonErrorResponse("Wiki not found.", 404);
  if (state.status === "error") return jsonErrorResponse(wikiDraftUnavailableMessage, 502);

  const client = createDraftWikiApiClient(undefined, headers);
  if (!client) return jsonErrorResponse(wikiDraftUnavailableMessage, 502);
  try {
    const draft = await client.createWikiDraft(state.requestBody);
    return NextResponse.json({ href: buildWikiDraftEditPath(draft.wikiIdentifier, draft.resourceType, themeColor) });
  } catch (error) {
    if (getWikiRouteErrorStatus(error) === 419) return csrfTokenMismatchResponse();
    console.error("Failed to prepare Wiki editing.", { status: getWikiRouteErrorStatus(error) });
    return jsonErrorResponse(wikiDraftUnavailableMessage, 502);
  }
}
