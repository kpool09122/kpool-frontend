import { identityApiTypes } from "@kpool/types";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { requestIdentity } from "./identityBrowserRequest";

const sessionSchema = identityApiTypes.schemas.SocialLinkingResult.extend({
  expiresAt: z.string().datetime({ offset: true }),
});
export type SocialLinkingSession = z.infer<typeof sessionSchema>;

export const socialLinkingBrowserApi = {
  get: (language?: string) => requestIdentity(
    "/api/identity/auth/social/link",
    (body) => parseWithSchemaLog("social linking session", sessionSchema, body),
    { method: "GET", language },
  ),
  sendEmail: (language?: string) => requestIdentity(
    "/api/identity/auth/social/link/email",
    (body) => parseWithSchemaLog("social linking email", identityApiTypes.schemas.SendSocialLinkingEmailResult, body),
    { language },
  ),
  verifyEmail: (authCode: string, language?: string) => requestIdentity(
    "/api/identity/auth/social/link/email/verification",
    (body) => parseWithSchemaLog("social linking verification", identityApiTypes.schemas.RedirectUrlResult, body),
    { body: { authCode }, language },
  ),
};

export type SocialLinkingBrowserApi = typeof socialLinkingBrowserApi;
