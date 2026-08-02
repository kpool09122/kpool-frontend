import {
  parseAccountMembersResponse,
  parseAccountSummary,
  parseInvitationSummaries,
  parseListAccountDocumentsResponse,
  parsePrincipalGroupsResponse,
  parseUploadAccountDocumentsResponse,
  type AccountSummary,
  type InvitationSummary,
  type InviteAccountMembersRequest,
  type ListAccountDocumentsResponse,
  type ListMembersResponse,
  type ListPrincipalGroupsResponse,
  type UploadAccountDocumentsRequest,
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

type UploadAccountDocumentsOptions = AccountRequestOptions & {
  requestBody: UploadAccountDocumentsRequest;
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

export type AccountBrowserApiError = Error & { accountRouteStatus: number };

export const isAccountBrowserApiError = (error: unknown): error is AccountBrowserApiError =>
  error instanceof Error &&
  "accountRouteStatus" in error &&
  typeof (error as { accountRouteStatus: unknown }).accountRouteStatus === "number";

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

const createRouteError = (
  response: Response,
  body: unknown,
  fallbackErrorMessage: string,
): AccountBrowserApiError =>
  Object.assign(new Error(getRouteErrorMessage(body, fallbackErrorMessage)), {
    accountRouteStatus: response.status,
  });

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
    throw createRouteError(response, body, fallbackErrorMessage);
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
    throw createRouteError(response, body, fallbackErrorMessage);
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
    throw createRouteError(response, body, fallbackErrorMessage);
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
    throw createRouteError(response, body, fallbackErrorMessage);
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
    throw createRouteError(response, body, fallbackErrorMessage);
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
    throw createRouteError(response, body, fallbackErrorMessage);
  }

  return parsePrincipalGroupsResponse(body);
};

export const fetchAccountDocuments = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
}: AccountRequestOptions): Promise<ListAccountDocumentsResponse> => {
  const response = await fetchAdapter("/api/account/my/documents", {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw createRouteError(response, body, fallbackErrorMessage);
  }

  return parseListAccountDocumentsResponse(body);
};

export const uploadAccountDocuments = async ({
  accountIdentifier,
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
}: UploadAccountDocumentsOptions): Promise<ListAccountDocumentsResponse> => {
  const response = await fetchAdapter(`/api/account/accounts/${accountIdentifier}/documents`, {
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
    throw createRouteError(response, body, fallbackErrorMessage);
  }

  return parseUploadAccountDocumentsResponse(body);
};
