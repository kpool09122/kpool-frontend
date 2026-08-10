import { NextResponse, type NextRequest } from "next/server";

import { getAccountApiBaseUrl } from "@/gateways/account/accountApi";
import {
  accountApiUnavailableResponse,
  getAccountRouteErrorMessage,
  getForwardHeaders,
  readResponseBody,
} from "../../../routeSupport";

type RouteContext = {
  params: Promise<{
    documentType: string;
  }>;
};

const responseHeaderNames = [
  "cache-control",
  "content-disposition",
  "content-length",
  "content-type",
] as const;

const getDocumentResponseHeaders = (apiResponse: Response): Headers => {
  const headers = new Headers();

  for (const headerName of responseHeaderNames) {
    const value = apiResponse.headers.get(headerName);

    if (value) {
      headers.set(headerName, value);
    }
  }

  return headers;
};

const getAttachmentDisposition = (contentDisposition: string | null): string =>
  contentDisposition
    ? contentDisposition.replace(/^inline/i, "attachment")
    : "attachment";

export async function GET(request: NextRequest, context: RouteContext) {
  const baseUrl = getAccountApiBaseUrl();

  if (!baseUrl) {
    return accountApiUnavailableResponse();
  }

  const { documentType } = await context.params;

  try {
    const apiResponse = await fetch(`${baseUrl}/my/documents/${encodeURIComponent(documentType)}`, {
      method: "GET",
      headers: getForwardHeaders(request, false),
      cache: "no-store",
    });

    if (!apiResponse.ok) {
      const body = await readResponseBody(apiResponse);

      return NextResponse.json(
        { message: getAccountRouteErrorMessage(apiResponse.status, body) },
        { status: apiResponse.status },
      );
    }

    const headers = getDocumentResponseHeaders(apiResponse);

    if (new URL(request.url).searchParams.get("download") === "1") {
      headers.set("content-disposition", getAttachmentDisposition(headers.get("content-disposition")));
    }

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { message: "Account API is temporarily unavailable." },
      { status: 502 },
    );
  }
}
