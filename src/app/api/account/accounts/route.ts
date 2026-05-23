import { NextResponse, type NextRequest } from "next/server";
import { accountApiTypes } from "@kpool/types";
import { z } from "zod";

import {
  getAccountApiBaseUrl,
  parseCreateAccountRequest,
} from "@/gateways/account/accountApi";
import { getIdentityRouteErrorMessage } from "@/gateways/identity/identityApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export async function POST(request: NextRequest) {
  const baseUrl = getAccountApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Account API is not configured." },
      { status: 500 },
    );
  }

  try {
    const account = parseCreateAccountRequest(await request.json());
    const apiResponse = await fetch(`${baseUrl}/accounts`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(request.headers.get("accept-language")
          ? { "Accept-Language": request.headers.get("accept-language") ?? "" }
          : {}),
        "Content-Type": "application/json",
        ...(request.headers.get("cookie")
          ? { Cookie: request.headers.get("cookie") ?? "" }
          : {}),
      },
      body: JSON.stringify(account),
      cache: "no-store",
    });
    const body = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getIdentityRouteErrorMessage({ status: apiResponse.status, data: body }) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        "account create response",
        accountApiTypes.schemas.CreateAccountResult,
        Array.isArray(body) && body.length === 0 ? {} : body,
      ),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Account API response did not match the expected schema." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: getIdentityRouteErrorMessage({ data: error }) },
      { status: 502 },
    );
  }
}
