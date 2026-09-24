import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { forwardIdentityRoute, identityApiSchemaErrorResponse } from "../../routeSupport";

type PasskeyRouteContext = { params: Promise<{ passkeyIdentifier: string }> };

const getPath = async (context: PasskeyRouteContext): Promise<string | null> => {
  const { passkeyIdentifier } = await context.params;
  const result = z.string().uuid().safeParse(passkeyIdentifier);

  return result.success
    ? `/auth/passkeys/${encodeURIComponent(result.data)}`
    : null;
};

export async function PATCH(request: NextRequest, context: PasskeyRouteContext) {
  const path = await getPath(context);

  return path
    ? forwardIdentityRoute(request, {
      method: "PATCH",
      path,
      requestSchema: identityApiTypes.schemas.UpdatePasskeyRequestBody,
      responseSchema: identityApiTypes.schemas.KPool_Common_EmptyJsonObject,
    })
    : identityApiSchemaErrorResponse();
}

export async function DELETE(request: NextRequest, context: PasskeyRouteContext) {
  const path = await getPath(context);

  return path
    ? forwardIdentityRoute(request, {
      method: "DELETE",
      path,
      responseSchema: identityApiTypes.schemas.KPool_Common_EmptyJsonObject,
    })
    : identityApiSchemaErrorResponse();
}
