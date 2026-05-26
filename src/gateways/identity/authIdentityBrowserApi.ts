import {
  parseIdentitySummary,
  type IdentitySummary,
} from "@/gateways/identity/identityApi";

type FetchCurrentAuthenticatedIdentityOptions = {
  fetchAdapter?: typeof fetch;
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const fetchCurrentAuthenticatedIdentity = async ({
  fetchAdapter = fetch,
}: FetchCurrentAuthenticatedIdentityOptions = {}): Promise<IdentitySummary | null> => {
  try {
    const response = await fetchAdapter("/api/identity/auth/me", {
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return parseIdentitySummary(await readResponseBody(response));
  } catch {
    return null;
  }
};
