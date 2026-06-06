import { NextResponse, type NextRequest } from "next/server";

import { createDraftWikiApiClient } from "@/gateways/wiki/draftWiki";
import {
  getForwardedWikiApiHeaders,
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
    const status = typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: { status?: unknown } }).response?.status === "number"
      ? (error as { response: { status: number } }).response.status
      : undefined;

    console.error("Wiki draft wiki auto-create route failed", { status });

    return NextResponse.json(
      { message: wikiDraftUnavailableMessage },
      { status: 502 },
    );
  }
}
