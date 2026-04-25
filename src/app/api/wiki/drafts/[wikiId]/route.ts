import { NextResponse, type NextRequest } from "next/server";

import {
  createDraftWikiApiClient,
  getDraftWikiErrorMessage,
  saveDraftWiki,
} from "../../../../wiki/draftWiki";

type WikiDraftSaveRouteContext = {
  params: Promise<{
    wikiId: string;
  }>;
};

export async function POST(request: NextRequest, context: WikiDraftSaveRouteContext) {
  const client = createDraftWikiApiClient();

  if (!client) {
    return NextResponse.json(
      { message: "Wiki draft API is not configured." },
      { status: 500 },
    );
  }

  try {
    const { wikiId } = await context.params;
    const body = await request.json();
    const result = await saveDraftWiki(client, wikiId, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: getDraftWikiErrorMessage(error) },
      { status: 502 },
    );
  }
}
