import { NextResponse, type NextRequest } from "next/server";

import {
  createDraftWikiApiClient,
  deleteDraftWiki,
  saveDraftWiki,
} from "@/gateways/wiki/draftWiki";
import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
  wikiDraftUnavailableMessage,
} from "../../wikiRouteSupport";

type WikiDraftSaveRouteContext = {
  params: Promise<{
    wikiId: string;
  }>;
};

const createClient = (request: NextRequest) =>
  createDraftWikiApiClient(
    undefined,
    getForwardedWikiApiHeaders(request.headers),
  );

export async function POST(request: NextRequest, context: WikiDraftSaveRouteContext) {
  const client = createClient(request);

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
      status: getWikiRouteErrorStatus(error),
    });

    return NextResponse.json(
      { message: wikiDraftUnavailableMessage },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest, context: WikiDraftSaveRouteContext) {
  const client = createClient(request);

  if (!client) {
    return NextResponse.json(
      { message: "Wiki draft API is not configured." },
      { status: 500 },
    );
  }

  const { wikiId } = await context.params;

  try {
    await deleteDraftWiki(client, wikiId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete wiki draft.", {
      wikiId,
      status: getWikiRouteErrorStatus(error),
    });

    return NextResponse.json(
      { message: wikiDraftUnavailableMessage },
      { status: 502 },
    );
  }
}
