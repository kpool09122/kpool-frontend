import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  forwardIdentityRoute,
  identityApiSchemaErrorResponse,
} from "../../../../../routeSupport";

type RecoverySocialRouteContext = {
  params: Promise<{ provider: string }>;
};

const ProviderSchema = z.enum(["google", "line", "kakao"]);

export async function GET(request: NextRequest, context: RecoverySocialRouteContext) {
  const { provider } = await context.params;
  const parsedProvider = ProviderSchema.safeParse(provider);
  if (!parsedProvider.success) {
    return identityApiSchemaErrorResponse();
  }

  return forwardIdentityRoute(request, {
    method: "GET",
    path: `/auth/passkeys/recovery/social/${parsedProvider.data}/redirect`,
    responseSchema: identityApiTypes.schemas.RedirectUrlResult,
  });
}
