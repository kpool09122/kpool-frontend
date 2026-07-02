import { NextResponse, type NextRequest } from "next/server";

import {
  createDraftWikiApiClient,
  createManagedWikiDraftWikisUrl,
} from "@/gateways/wiki/draftWiki";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  wikiDraftUnavailableMessage,
} from "../wikiRouteSupport";
import { createDraftWikiListRouteGetHandler } from "./draftWikisRouteSupport";

const createClient = (request: NextRequest) =>
  createDraftWikiApiClient(
    undefined,
    getForwardedWikiApiHeaders(request.headers),
  );

export const GET = createDraftWikiListRouteGetHandler(
  createManagedWikiDraftWikisUrl,
  "Wiki draft wikis",
  "wiki draft wiki list response",
);

export async function POST(request: NextRequest) {
  const client = createClient(request);

  if (!client) {
    return jsonErrorResponse("Wiki draft API is not configured.", 500);
  }

  try {
    const result = await client.createWikiDraft(await request.json());

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Wiki draft wiki creation route failed", error);

    return NextResponse.json(
      { message: wikiDraftUnavailableMessage },
      { status: 502 },
    );
  }
}
