import { NextResponse, type NextRequest } from "next/server";

import {
  createDraftWikiApiClient,
  submitDraftWiki,
} from "@/gateways/wiki/draftWiki";
import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
  wikiDraftUnavailableMessage,
} from "../../../wikiRouteSupport";

type WikiDraftSubmitRouteContext = {
  params: Promise<{
    wikiId: string;
  }>;
};

export async function POST(request: NextRequest, context: WikiDraftSubmitRouteContext) {
  const client = createDraftWikiApiClient(
    undefined,
    getForwardedWikiApiHeaders(request.headers),
  );

  if (!client) {
    return NextResponse.json(
      { message: "Wiki draft API is not configured." },
      { status: 500 },
    );
  }

  const { wikiId } = await context.params;

  try {
    const body = await request.json();
    const result = await submitDraftWiki(client, wikiId, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to submit wiki draft.", {
      wikiId,
      status: getWikiRouteErrorStatus(error),
    });

    return NextResponse.json(
      { message: wikiDraftUnavailableMessage },
      { status: 502 },
    );
  }
}
