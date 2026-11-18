import { identityApiTypes } from "@kpool/types";
import { z } from "zod";
export const scopeSettingsSchema =
  identityApiTypes.schemas.AuthorizationScopeSettings.strip().refine(
    ({ scopes }) => new Set(scopes).size === scopes.length,
  );
export const connectionSchema =
  identityApiTypes.schemas.AuthorizationConnection.strip();
export const connectionListSchema = z
  .object({ connections: z.array(connectionSchema) })
  .strip();
export const emptySuccessSchema = z.array(z.unknown()).length(0);
export const consentScopes = identityApiTypes.schemas.ConsentScope.options;
export type ScopeSettings = z.infer<typeof scopeSettingsSchema>;
export type AuthorizationConnection = z.infer<typeof connectionSchema>;
