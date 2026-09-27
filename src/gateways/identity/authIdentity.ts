import {
  getIdentityApiBaseUrl,
  parseAuthenticatedIdentitySummary,
  type AuthenticatedIdentitySummary,
} from "./identityApi";

type FetchAuthenticatedIdentityOptions = {
  cookieHeader?: string;
  fetchAdapter?: typeof fetch;
};

export const mockAccountPolicyCookieName = "kpool-mock-account-policy";
export const mockAccountStatusCookieName = "kpool-mock-account-status";

const isMockIdentityEnabled = (): boolean =>
  process.env.KPOOL_ENABLE_MOCK_WIKI_GATEWAY === "1";

const hasCookieValue = (cookieHeader: string, name: string, value: string): boolean =>
  cookieHeader.split(";").some((cookie) => cookie.trim() === `${name}=${value}`);

const createMockAuthenticatedIdentity = (cookieHeader: string): AuthenticatedIdentitySummary => {
  const hasAccountUpdatePolicy = hasCookieValue(cookieHeader, mockAccountPolicyCookieName, "update");
  const accountType = hasAccountUpdatePolicy ? "corporation" : "individual";
  const accountStatus = cookieHeader.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${mockAccountStatusCookieName}=`))
    ?.slice(mockAccountStatusCookieName.length + 1) ?? "active";

  return parseAuthenticatedIdentitySummary({
    identityIdentifier: "11111111-1111-1111-1111-111111111111",
    identityName: "member",
    email: "member@example.com",
    language: hasCookieValue(cookieHeader, "kpool-locale", "en") ? "en" : "ja",
    profileImage: null,
    accountIdentifier: "22222222-2222-2222-2222-222222222222",
    accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
    accountType,
    accountPolicies: hasAccountUpdatePolicy
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
    account: accountStatus === "missing" ? null : {
      accountIdentifier: "22222222-2222-2222-2222-222222222222",
      email: "member@example.com",
      type: accountStatus === "pending" ? null : accountType,
      name: "Member Account",
      status: accountStatus,
      accountCategory: "general",
      phone: null,
      address: null,
    },
    originalAccount: null,
    delegationIdentifier: null,
    switchableAccounts: [],
    authenticationMethods: { passkeyCount: 1, linkedSocialProviders: [] },
  });
};

export const fetchAuthenticatedIdentity = async ({
  cookieHeader,
  fetchAdapter = fetch,
}: FetchAuthenticatedIdentityOptions = {}): Promise<AuthenticatedIdentitySummary | null> => {
  const baseUrl = getIdentityApiBaseUrl();

  if (!cookieHeader) {
    return null;
  }

  if (isMockIdentityEnabled()) {
    const hasMockSession = cookieHeader.split(";").some((cookie) =>
      /^(kpool-mock-account-status|kpool-mock-account-policy|kpool-e2e-wiki-principal)=/.test(cookie.trim()),
    );
    return hasMockSession ? createMockAuthenticatedIdentity(cookieHeader) : null;
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

    return parseAuthenticatedIdentitySummary(await response.json());
  } catch {
    return null;
  }
};
