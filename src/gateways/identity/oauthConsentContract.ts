import { identityApiTypes } from "@kpool/types";
import { z } from "zod";

export const schemas = identityApiTypes.schemas;
export type ConsentScope = z.infer<typeof schemas.ConsentScope>;
export type ConsentDetails = z.infer<typeof schemas.AuthorizationRequestResult>;
const detailsSchema = schemas.AuthorizationRequestResult.strip().extend({
  requestIdentifier: z.string().min(1), expiresAt: z.string().datetime({ offset: true }),
});
export const consentContinuationSchema = schemas.AuthorizationContinuationResult.strip().extend({
  // Backend performs exact registration validation; the browser must still refuse executable schemes.
  redirectUri: z.string().url().refine((value) => /^https?:\/\//i.test(value)),
});
export const consentDetailsSchema = detailsSchema;
export const consentCreateSchema = schemas.CreateAuthorizationRequestBody.strip();
export const parseOAuthQuery = (query: string) => {
  const params = new URLSearchParams(query);
  const keys = ["client_id", "redirect_uri", "scope", "resource", "code_challenge", "code_challenge_method", "response_type", "state"];
  if (keys.some((key) => params.getAll(key).length !== 1)) return null;
  const result = consentCreateSchema.safeParse({
    clientIdentifier: params.get("client_id"), redirectUri: params.get("redirect_uri"),
    scopes: (params.get("scope") ?? "").split(/ +/).filter(Boolean), resource: params.get("resource"),
    codeChallenge: params.get("code_challenge"), codeChallengeMethod: params.get("code_challenge_method"),
    responseType: params.get("response_type"), state: params.get("state"),
  });
  return result.success ? result.data : null;
};
