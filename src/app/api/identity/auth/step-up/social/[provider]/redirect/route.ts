import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  forwardIdentityRoute,
  identityApiSchemaErrorResponse,
} from "../../../../routeSupport";

type StepUpSocialRouteContext = {
  params: Promise<{ provider: string }>;
};

const ProviderSchema = z.enum(["google", "line", "kakao"]);
const ReturnToSchema = z.enum(["passkeys", "withdrawal"]);

export async function GET(request: NextRequest, context: StepUpSocialRouteContext) {
  const { provider } = await context.params;
  const parsedProvider = ProviderSchema.safeParse(provider);
  const parsedReturnTo = ReturnToSchema.safeParse(
    new URL(request.url).searchParams.get("returnTo") ?? "passkeys",
  );

  return parsedProvider.success && parsedReturnTo.success
    ? forwardIdentityRoute(request, {
      method: "GET",
      path: `/auth/step-up/social/${parsedProvider.data}/redirect?returnTo=${parsedReturnTo.data}`,
      responseSchema: identityApiTypes.schemas.RedirectUrlResult,
    })
    : identityApiSchemaErrorResponse();
}
