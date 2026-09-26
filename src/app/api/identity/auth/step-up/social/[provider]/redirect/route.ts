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

export async function GET(request: NextRequest, context: StepUpSocialRouteContext) {
  const { provider } = await context.params;
  const parsedProvider = ProviderSchema.safeParse(provider);

  return parsedProvider.success
    ? forwardIdentityRoute(request, {
      method: "GET",
      path: `/auth/step-up/social/${parsedProvider.data}/redirect`,
      responseSchema: identityApiTypes.schemas.RedirectUrlResult,
    })
    : identityApiSchemaErrorResponse();
}
