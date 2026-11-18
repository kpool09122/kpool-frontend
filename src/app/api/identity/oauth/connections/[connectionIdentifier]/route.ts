import type { NextRequest } from "next/server";
import { emptySuccessSchema } from "@/gateways/identity/oauthConnectionsContract";
import { forwardOAuthRoute } from "../../routeSupport";
export const DELETE = async (
  request: NextRequest,
  context: { params: Promise<{ connectionIdentifier: string }> },
) => {
  const { connectionIdentifier } = await context.params;
  return forwardOAuthRoute(request, {
    method: "DELETE",
    path: `/oauth/connections/${encodeURIComponent(connectionIdentifier)}`,
    responseSchema: emptySuccessSchema,
  });
};
