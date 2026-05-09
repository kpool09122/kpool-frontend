import { NextResponse, type NextRequest } from "next/server";
import { schemas } from "@kpool/types/identity-api";
import { z } from "zod";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
} from "../../../../../../identityApi";
import { parseWithSchemaLog } from "../../../../../../zodErrorLog";

type SocialRedirectRouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export async function GET(request: NextRequest, context: SocialRedirectRouteContext) {
  const baseUrl = getIdentityApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Identity API is not configured." },
      { status: 500 },
    );
  }

  try {
    const { provider } = await context.params;
    const apiResponse = await fetch(
      `${baseUrl}/auth/social/${encodeURIComponent(provider)}/redirect`,
      {
        headers: {
          Accept: "application/json",
          ...(request.headers.get("cookie")
            ? { Cookie: request.headers.get("cookie") ?? "" }
            : {}),
        },
        cache: "no-store",
      },
    );
    const body = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getIdentityRouteErrorMessage({ status: apiResponse.status, data: body }) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog("identity social redirect response", schemas.RedirectUrlResult, body),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Identity API response did not match the expected schema." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: getIdentityRouteErrorMessage({ data: error }) },
      { status: 502 },
    );
  }
}
