import { NextResponse, type NextRequest } from "next/server";

import {
  createDraftWikiApiClient,
  getDraftWikiErrorMessage,
  saveDraftWiki,
} from "@/gateways/wiki/draftWiki";
import { getForwardedWikiApiHeaders } from "../../wikiRouteSupport";

type WikiDraftSaveRouteContext = {
  params: Promise<{
    wikiId: string;
  }>;
};

const stringifyLogValue = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export async function POST(request: NextRequest, context: WikiDraftSaveRouteContext) {
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
    const result = await saveDraftWiki(client, wikiId, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to save wiki draft.", {
      wikiId,
      error: stringifyLogValue(error),
    });

    return NextResponse.json(
      { message: getDraftWikiErrorMessage(error) },
      { status: 502 },
    );
  }
}
