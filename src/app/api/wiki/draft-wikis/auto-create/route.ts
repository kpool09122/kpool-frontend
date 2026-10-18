import { backendErrorResponse } from "@/app/api/backendErrorResponse";

import { NextResponse, type NextRequest } from "next/server";

import { createDraftWikiApiClient } from "@/gateways/wiki/draftWiki";
import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
  jsonErrorResponse,
  wikiDraftUnavailableMessage,
} from "../../wikiRouteSupport";

const createClient = (request: NextRequest) =>
  createDraftWikiApiClient(
    undefined,
    getForwardedWikiApiHeaders(request.headers),
  );

export async function POST(request: NextRequest) {
  const client = createClient(request);

  if (!client) {
    return jsonErrorResponse("Wiki draft API is not configured.", 500);
  }

  try {
    const result = await client.autoCreateWikiDraft(await request.json());

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Wiki draft wiki auto-create route failed", {
      status: getWikiRouteErrorStatus(error),
    });

    return backendErrorResponse(error, wikiDraftUnavailableMessage);
  }
}
