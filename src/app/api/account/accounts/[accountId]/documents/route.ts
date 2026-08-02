import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAccountApiBaseUrl,
  parseUploadAccountDocumentsRequest,
  parseUploadAccountDocumentsResponse,
} from "@/gateways/account/accountApi";
import {
  accountApiUnavailableResponse,
  getAccountRouteErrorMessage,
  getForwardHeaders,
  readResponseBody,
} from "../../../routeSupport";

type AccountDocumentRouteContext = {
  params: Promise<{ accountId: string }>;
};

const maxAccountDocumentsPayloadSizeBytes = 15 * 1024 * 1024;

const isPayloadTooLarge = (request: NextRequest) => {
  const contentLength = request.headers.get("content-length");
  return contentLength ? Number(contentLength) > maxAccountDocumentsPayloadSizeBytes : false;
};

const forwardAccountDocumentsRequest = async (
  request: NextRequest,
  body: unknown,
  context: AccountDocumentRouteContext,
) => {
  const baseUrl = getAccountApiBaseUrl();

  if (!baseUrl) {
    return accountApiUnavailableResponse();
  }

  try {
    const { accountId } = await context.params;
    const apiResponse = await fetch(`${baseUrl}/accounts/${accountId}/documents`, {
      method: "POST",
      headers: getForwardHeaders(request, true),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getAccountRouteErrorMessage(apiResponse.status, responseBody) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(parseUploadAccountDocumentsResponse(responseBody), { status: apiResponse.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Account API response did not match the expected schema." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: "Account API is temporarily unavailable." },
      { status: 502 },
    );
  }
};

export async function POST(request: NextRequest, context: AccountDocumentRouteContext) {
  if (isPayloadTooLarge(request)) {
    return NextResponse.json(
      { message: "Account document upload payload is too large." },
      { status: 413 },
    );
  }

  return forwardAccountDocumentsRequest(
    request,
    parseUploadAccountDocumentsRequest(await request.json()),
    context,
  );
}
