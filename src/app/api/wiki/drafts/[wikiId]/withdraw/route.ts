import { NextResponse, type NextRequest } from "next/server";

import {
  createDraftWikiApiClient,
  withdrawDraftWiki,
} from "@/gateways/wiki/draftWiki";
import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
  wikiDraftUnavailableMessage,
} from "../../../wikiRouteSupport";

type WikiDraftWithdrawRouteContext = {
  params: Promise<{
    wikiId: string;
  }>;
};

export async function POST(request: NextRequest, context: WikiDraftWithdrawRouteContext) {
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
    const result = await withdrawDraftWiki(client, wikiId);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to withdraw wiki draft.", {
      wikiId,
      status: getWikiRouteErrorStatus(error),
    });

    return NextResponse.json(
      { message: wikiDraftUnavailableMessage },
      { status: 502 },
    );
  }
}
