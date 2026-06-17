import {
  parseIdentitySummary,
  parseRedirectUrlResult,
  type IdentityLoginRequest,
} from "@/gateways/identity/identityApi";

export type IdentityProvider = {
  id: "google" | "line" | "kakao";
  label: string;
  iconSrc: string;
  iconClassName: string;
  iconSize: number;
  buttonClassName: string;
};

export type LoginResult =
  | { ok: true; returnTo?: string }
  | {
      ok: false;
      message: string;
    };

export type SocialRedirectResult =
  | {
      ok: true;
      redirectUrl: string;
    }
  | {
      ok: false;
      message: string;
    };

export type LoginAdapter = (credentials: IdentityLoginRequest) => Promise<LoginResult>;
export type SocialRedirectAdapter = (
  provider: IdentityProvider["id"],
  returnTo?: string,
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
    return "/mypage";
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

  if (response.status === 401) {
    return "メールアドレスまたはパスワードが違います。";
  }

  return "ログインに失敗しました。時間をおいて再度お試しください。";
};

export const loginWithEmail: LoginAdapter = async (credentials) => {
  const response = await fetch("/api/identity/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    return {
      ok: false,
      message: await getAuthErrorMessage(response),
    };
  }

  const body = await response.json();
  parseIdentitySummary(body);
  const responseReturnTo = (body as { return_to?: unknown }).return_to;

  return {
    ok: true,
    returnTo: typeof responseReturnTo === "string"
      ? normalizeReturnTo(responseReturnTo)
      : undefined,
  };
};

export const requestSocialRedirect: SocialRedirectAdapter = async (provider, returnTo) => {
  const params = new URLSearchParams();
  const normalizedReturnTo = normalizeReturnTo(returnTo);

  params.set("return_to", normalizedReturnTo);

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
