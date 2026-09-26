import {
  parseRedirectUrlResult,
  type IdentitySummary,
} from "@/gateways/identity/identityApi";
import {
  passkeyBrowserApi,
  type PasskeyBrowserApi,
} from "@/gateways/identity/passkeyBrowserApi";
import {
  webAuthnBrowserAdapter,
  type WebAuthnBrowserAdapter,
  type WebAuthnFailureReason,
} from "./webAuthnBrowserAdapter";

export type IdentityProvider = {
  id: "google" | "line" | "kakao";
  label: string;
  iconSrc: string;
  iconClassName: string;
  iconSize: number;
  buttonClassName: string;
};

export type PasskeyLoginResult =
  | { ok: true; identity: IdentitySummary; returnTo: string }
  | { ok: false; reason: WebAuthnFailureReason | "api"; message?: string };

export type SocialRedirectResult =
  | {
      ok: true;
      redirectUrl: string;
    }
  | {
      ok: false;
      message: string;
    };

export type PasskeyLoginAdapter = (options?: {
  api?: PasskeyBrowserApi;
  language?: string;
  returnTo?: string;
  webAuthn?: WebAuthnBrowserAdapter;
}) => Promise<PasskeyLoginResult>;
export type SocialRedirectAdapter = (
  provider: IdentityProvider["id"],
  returnTo?: string,
  oneTimeToken?: string,
  accountType?: string,
) => Promise<SocialRedirectResult>;

export const identityProviders: IdentityProvider[] = [
  {
    id: "google",
    label: "Google",
    iconSrc: "/auth/google.png",
    iconClassName: "h-9 w-9",
    iconSize: 36,
    buttonClassName:
      "border border-stroke-subtle bg-white text-text-strong hover:border-[#4285F4] hover:bg-[#f8fbff]",
  },
  {
    id: "line",
    label: "LINE",
    iconSrc: "/auth/line.png",
    iconClassName: "h-12 w-12",
    iconSize: 48,
    buttonClassName: "bg-[#06C755] text-white hover:bg-[#05b84f]",
  },
  {
    id: "kakao",
    label: "Kakao",
    iconSrc: "/auth/kakao.png",
    iconClassName: "h-12 w-12",
    iconSize: 48,
    buttonClassName: "bg-[#FFE800] text-[#191919] hover:bg-[#f4dd00]",
  },
];

export const normalizeReturnTo = (value: string | null | undefined): string => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }

  return value;
};

export const getAuthErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as unknown;

    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
  } catch {
    return "ログインに失敗しました。時間をおいて再度お試しください。";
  }

  return "ログインに失敗しました。時間をおいて再度お試しください。";
};

export const loginWithPasskey: PasskeyLoginAdapter = async ({
  api = passkeyBrowserApi,
  language,
  returnTo,
  webAuthn = webAuthnBrowserAdapter,
} = {}) => {
  if (!webAuthn.isSupported()) {
    return { ok: false, reason: "unsupported" };
  }

  const optionsResult = await api.createAuthenticationOptions();

  if (!optionsResult.ok) {
    return { ok: false, reason: "api", message: optionsResult.message };
  }

  const credentialResult = await webAuthn.get(optionsResult.data);

  if (!credentialResult.ok) {
    return credentialResult;
  }

  const authenticationResult = await api.authenticate({
    challengeKey: optionsResult.data.challengeKey,
    credential: credentialResult.credential,
  }, language);

  if (!authenticationResult.ok) {
    return { ok: false, reason: "api", message: authenticationResult.message };
  }

  return {
    ok: true,
    identity: authenticationResult.data,
    returnTo: normalizeReturnTo(returnTo),
  };
};

export const requestSocialRedirect: SocialRedirectAdapter = async (
  provider,
  returnTo,
  oneTimeToken,
  accountType,
) => {
  const params = new URLSearchParams();
  const normalizedReturnTo = normalizeReturnTo(returnTo);

  params.set("return_to", normalizedReturnTo);

  if (oneTimeToken) {
    params.set("oneTimeToken", oneTimeToken);
  }

  if (accountType) {
    params.set("accountType", accountType);
  }

  const response = await fetch(
    `/api/identity/auth/social/${encodeURIComponent(provider)}/redirect?${params.toString()}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      message: await getAuthErrorMessage(response),
    };
  }

  const redirect = parseRedirectUrlResult(await response.json());

  return { ok: true, redirectUrl: redirect.redirectUrl };
};
