import {
  getIdentityApiBaseUrl,
  parseIdentitySummary,
  type IdentitySummary,
} from "./identityApi";

type FetchAuthenticatedIdentityOptions = {
  cookieHeader?: string;
  fetchAdapter?: typeof fetch;
};

export const fetchAuthenticatedIdentity = async ({
  cookieHeader,
  fetchAdapter = fetch,
}: FetchAuthenticatedIdentityOptions = {}): Promise<IdentitySummary | null> => {
  const baseUrl = getIdentityApiBaseUrl();

  if (!baseUrl || !cookieHeader) {
    return null;
  }

  try {
    const response = await fetchAdapter(`${baseUrl}/auth/me`, {
      headers: {
        Accept: "application/json",
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return parseIdentitySummary(await response.json());
  } catch {
    return null;
  }
};
