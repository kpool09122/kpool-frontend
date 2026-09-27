import { identityApiTypes } from "@kpool/types";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { forwardIdentityRoute } from "../../../../../routeSupport";

type RecoverySocialRouteContext = {
  params: Promise<{ provider: string }>;
};

const ProviderSchema = z.enum(["google", "line", "kakao"]);

export async function GET(request: NextRequest, context: RecoverySocialRouteContext) {
  const { provider } = await context.params;
  const parsedProvider = ProviderSchema.safeParse(provider);
  if (!parsedProvider.success) {
    return NextResponse.json({ message: "Invalid social provider." }, { status: 400 });
  }

  return forwardIdentityRoute(request, {
    method: "GET",
    path: `/auth/passkeys/recovery/social/${parsedProvider.data}/redirect`,
    responseSchema: identityApiTypes.schemas.RedirectUrlResult,
  });
}
