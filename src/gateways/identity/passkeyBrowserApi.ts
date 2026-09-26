import {
  parseIdentitySummary,
  parsePasskeyAuthenticationOptionsResult,
  parsePasskeyListResult,
  parsePasskeyRegistrationOptionsResult,
  parseRedirectUrlResult,
  type AddPasskeyRequest,
  type AuthenticateWithPasskeyRequest,
  type CompleteStepUpWithPasskeyRequest,
  type CreatePasskeyRegistrationOptionsRequest,
  type IdentitySummary,
  type PasskeyAuthenticationOptionsResult,
  type PasskeyListResult,
  type PasskeyRegistrationOptionsResult,
  type RedirectUrlResult,
  type RegisterWithPasskeyRequest,
  type UpdatePasskeyRequest,
} from "@/gateways/identity/identityApi";

export type IdentityBrowserApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status: number };

type RequestOptions = {
  body?: unknown;
  language?: string;
  method?: "DELETE" | "GET" | "PATCH" | "POST";
};

const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
};

const getMessage = (body: unknown): string => {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }

  return "認証処理に失敗しました。時間をおいて再度お試しください。";
};

const request = async <T>(
  url: string,
  parseResponse: (body: unknown) => T,
  { body, language, method = "POST" }: RequestOptions = {},
): Promise<IdentityBrowserApiResult<T>> => {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(language ? { "Accept-Language": language } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      credentials: "include",
      cache: "no-store",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const responseBody = await readBody(response);

    if (!response.ok) {
      return {
        ok: false,
        message: getMessage(responseBody),
        status: response.status,
      };
    }

    return { ok: true, data: parseResponse(responseBody) };
  } catch {
    return {
      ok: false,
      message: "認証処理に失敗しました。時間をおいて再度お試しください。",
      status: 0,
    };
  }
};

const parseEmpty = (): Record<string, never> => ({});

export const passkeyBrowserApi = {
  createAuthenticationOptions: () =>
    request(
      "/api/identity/auth/passkeys/authentication/options",
      parsePasskeyAuthenticationOptionsResult,
    ),
  authenticate: (body: AuthenticateWithPasskeyRequest, language?: string) =>
    request(
      "/api/identity/auth/passkeys/authentication",
      parseIdentitySummary,
      { body, language },
    ),
  createRegistrationOptions: (
    body: CreatePasskeyRegistrationOptionsRequest,
    language?: string,
  ) => request(
    "/api/identity/auth/passkeys/registration/options",
    parsePasskeyRegistrationOptionsResult,
    { body, language },
  ),
  register: (body: RegisterWithPasskeyRequest, language?: string) =>
    request(
      "/api/identity/auth/passkeys/registration",
      parseIdentitySummary,
      { body, language },
    ),
  list: () => request(
    "/api/identity/auth/passkeys",
    parsePasskeyListResult,
    { method: "GET" },
  ),
  createAdditionOptions: () => request(
    "/api/identity/auth/passkeys/addition/options",
    parsePasskeyRegistrationOptionsResult,
  ),
  createStepUpPasskeyOptions: () => request(
    "/api/identity/auth/step-up/passkey/options",
    parsePasskeyAuthenticationOptionsResult,
  ),
  completeStepUpWithPasskey: (body: CompleteStepUpWithPasskeyRequest) => request(
    "/api/identity/auth/step-up/passkey",
    parseEmpty,
    { body },
  ),
  createStepUpSocialRedirect: (provider: "google" | "line" | "kakao") => request(
    `/api/identity/auth/step-up/social/${encodeURIComponent(provider)}/redirect`,
    parseRedirectUrlResult,
    { method: "GET" },
  ),
  add: (body: AddPasskeyRequest) => request(
    "/api/identity/auth/passkeys/addition",
    parseEmpty,
    { body },
  ),
  update: (passkeyIdentifier: string, body: UpdatePasskeyRequest) => request(
    `/api/identity/auth/passkeys/${encodeURIComponent(passkeyIdentifier)}`,
    parseEmpty,
    { body, method: "PATCH" },
  ),
  delete: (passkeyIdentifier: string) => request(
    `/api/identity/auth/passkeys/${encodeURIComponent(passkeyIdentifier)}`,
    parseEmpty,
    { method: "DELETE" },
  ),
};

export type PasskeyBrowserApi = {
  createAuthenticationOptions: () => Promise<IdentityBrowserApiResult<PasskeyAuthenticationOptionsResult>>;
  authenticate: (body: AuthenticateWithPasskeyRequest, language?: string) => Promise<IdentityBrowserApiResult<IdentitySummary>>;
  createRegistrationOptions: (body: CreatePasskeyRegistrationOptionsRequest, language?: string) => Promise<IdentityBrowserApiResult<PasskeyRegistrationOptionsResult>>;
  register: (body: RegisterWithPasskeyRequest, language?: string) => Promise<IdentityBrowserApiResult<IdentitySummary>>;
  list: () => Promise<IdentityBrowserApiResult<PasskeyListResult>>;
  createAdditionOptions: () => Promise<IdentityBrowserApiResult<PasskeyRegistrationOptionsResult>>;
  createStepUpPasskeyOptions: () => Promise<IdentityBrowserApiResult<PasskeyAuthenticationOptionsResult>>;
  completeStepUpWithPasskey: (body: CompleteStepUpWithPasskeyRequest) => Promise<IdentityBrowserApiResult<Record<string, never>>>;
  createStepUpSocialRedirect: (provider: "google" | "line" | "kakao") => Promise<IdentityBrowserApiResult<RedirectUrlResult>>;
  add: (body: AddPasskeyRequest) => Promise<IdentityBrowserApiResult<Record<string, never>>>;
  update: (passkeyIdentifier: string, body: UpdatePasskeyRequest) => Promise<IdentityBrowserApiResult<Record<string, never>>>;
  delete: (passkeyIdentifier: string) => Promise<IdentityBrowserApiResult<Record<string, never>>>;
};
