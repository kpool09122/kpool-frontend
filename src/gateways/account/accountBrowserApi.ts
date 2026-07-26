import {
  parseAccountMembersResponse,
  parseAccountSummary,
  parseInvitationSummaries,
  parsePrincipalGroupsResponse,
  type AccountSummary,
  type InvitationSummary,
  type InviteAccountMembersRequest,
  type ListMembersResponse,
  type ListPrincipalGroupsResponse,
  type UpdateAccountRequest,
  type UpdatePrincipalGroupMembersRequest,
} from "./accountApi";

type AccountRequestOptions = {
  accountIdentifier: string;
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
};

type UpdateAccountOptions = AccountRequestOptions & {
  requestBody: UpdateAccountRequest;
};

type InviteAccountMembersOptions = {
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
  requestBody: InviteAccountMembersRequest;
};

type UpdatePrincipalGroupMembersOptions = {
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
  requestBody: UpdatePrincipalGroupMembersRequest;
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getRouteErrorMessage = (body: unknown, fallbackErrorMessage: string): string =>
  typeof body === "object" &&
  body !== null &&
  "message" in body &&
  typeof (body as { message: unknown }).message === "string"
    ? (body as { message: string }).message
    : fallbackErrorMessage;

export const fetchAccount = async ({
  accountIdentifier,
  fallbackErrorMessage,
  fetchAdapter = fetch,
}: AccountRequestOptions): Promise<AccountSummary> => {
  const response = await fetchAdapter(`/api/account/accounts/${accountIdentifier}`, {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseAccountSummary(body);
};

export const updateAccount = async ({
  accountIdentifier,
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
}: UpdateAccountOptions): Promise<AccountSummary> => {
  const response = await fetchAdapter(`/api/account/accounts/${accountIdentifier}`, {
    method: "PATCH",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseAccountSummary(body);
};

export const inviteAccountMembers = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
}: InviteAccountMembersOptions): Promise<InvitationSummary[]> => {
  const response = await fetchAdapter("/api/account/invitations", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseInvitationSummaries(body);
};

export const fetchAccountMembers = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
}: {
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
}): Promise<ListMembersResponse> => {
  const response = await fetchAdapter("/api/account/members", {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseAccountMembersResponse(body);
};

export const fetchPrincipalGroups = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
}: {
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
}): Promise<ListPrincipalGroupsResponse> => {
  const response = await fetchAdapter("/api/account/principal-groups", {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parsePrincipalGroupsResponse(body);
};

export const updatePrincipalGroupMembers = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
}: UpdatePrincipalGroupMembersOptions): Promise<ListPrincipalGroupsResponse> => {
  const response = await fetchAdapter("/api/account/principal-groups/members", {
    method: "PATCH",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parsePrincipalGroupsResponse(body);
};
