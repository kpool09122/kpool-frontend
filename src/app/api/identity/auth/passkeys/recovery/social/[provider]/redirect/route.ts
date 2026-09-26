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
const IdentityIdentifierSchema = z.string().uuid();

export async function GET(request: NextRequest, context: RecoverySocialRouteContext) {
  const { provider } = await context.params;
  const parsedProvider = ProviderSchema.safeParse(provider);
  const parsedIdentityIdentifier = IdentityIdentifierSchema.safeParse(
    new URL(request.url).searchParams.get("identityIdentifier"),
  );

  if (!parsedProvider.success || !parsedIdentityIdentifier.success) {
    return identityApiSchemaErrorResponse();
  }

  const query = new URLSearchParams({
    identityIdentifier: parsedIdentityIdentifier.data,
  });

  return forwardIdentityRoute(request, {
    method: "GET",
    path: `/auth/passkeys/recovery/social/${parsedProvider.data}/redirect?${query.toString()}`,
    responseSchema: identityApiTypes.schemas.RedirectUrlResult,
  });
}
