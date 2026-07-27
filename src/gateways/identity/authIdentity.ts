import {
  getIdentityApiBaseUrl,
  parseIdentitySummary,
  type IdentitySummary,
} from "./identityApi";

type FetchAuthenticatedIdentityOptions = {
  cookieHeader?: string;
  fetchAdapter?: typeof fetch;
};

export const mockAccountPolicyCookieName = "kpool-mock-account-policy";

const isMockIdentityEnabled = (): boolean =>
  process.env.KPOOL_ENABLE_MOCK_WIKI_GATEWAY === "1";

const hasCookieValue = (cookieHeader: string, name: string, value: string): boolean =>
  cookieHeader.split(";").some((cookie) => cookie.trim() === `${name}=${value}`);

const createMockAuthenticatedIdentity = (cookieHeader: string): IdentitySummary => {
  const hasAccountUpdatePolicy = hasCookieValue(cookieHeader, mockAccountPolicyCookieName, "update");

  return parseIdentitySummary({
    identityIdentifier: "11111111-1111-1111-1111-111111111111",
    identityName: "member",
    email: "member@example.com",
    language: "ja",
    profileImage: null,
    accountIdentifier: "22222222-2222-2222-2222-222222222222",
    accountType: hasAccountUpdatePolicy ? "corporation" : "individual",
    accountEffectivePolicies: hasAccountUpdatePolicy
      ? [
          {
            policyIdentifier: "99999999-9999-9999-9999-999999999999",
            name: "ACCOUNT_ADMIN",
            isSystemPolicy: true,
            statements: [
              {
                effect: "allow",
                actions: ["account:update"],
                resourceTypes: ["ACCOUNT"],
              },
            ],
          },
        ]
      : [],
  });
};

export const fetchAuthenticatedIdentity = async ({
  cookieHeader,
  fetchAdapter = fetch,
}: FetchAuthenticatedIdentityOptions = {}): Promise<IdentitySummary | null> => {
  const baseUrl = getIdentityApiBaseUrl();

  if (!cookieHeader) {
    return null;
  }

  if (isMockIdentityEnabled()) {
    return createMockAuthenticatedIdentity(cookieHeader);
  }

  if (!baseUrl) {
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
