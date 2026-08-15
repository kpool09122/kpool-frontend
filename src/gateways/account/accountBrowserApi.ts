import {
  parseAccountMembersResponse,
  parseAccountSummary,
  parseAffiliationSummary,
  parseInvitationSummaries,
  parseListAccountDocumentsResponse,
  parseAccountCategoryChangeRequestDetailResponse,
  parseAccountCategoryChangeRequestSummary,
  parseListAccountCategoryChangeRequestsResponse,
  parsePrincipalGroupsResponse,
  parseUploadAccountDocumentsResponse,
  type AccountCategoryChangeRequestDetailResponse,
  type AccountSummary,
  type AffiliationSummary,
  type InvitationSummary,
  type InviteAccountMembersRequest,
  type ListAccountCategoryChangeRequestsResponse,
  type ListAccountDocumentsResponse,
  type ListMembersResponse,
  type ListPrincipalGroupsResponse,
  type RejectAccountCategoryChangeRequest,
  type RequestAccountCategoryChangeRequest,
  type RequestAffiliationRequest,
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

type FetchAccountDocumentFileOptions = {
  accountIdentifier?: string;
  documentType: string;
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
};


type RequestAccountCategoryChangeOptions = AccountRequestOptions & {
  requestBody: RequestAccountCategoryChangeRequest;
};

type ListAccountCategoryChangeRequestsOptions = {
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
  page?: number;
  perPage?: number;
  requestedAccountCategory?: string;
  status?: string;
};

type AccountCategoryChangeRequestDetailOptions = {
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
  requestId: string;
};

type RejectAccountCategoryChangeRequestOptions = AccountCategoryChangeRequestDetailOptions & {
  requestBody: RejectAccountCategoryChangeRequest;
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

type RequestAffiliationOptions = {
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
  requestBody: RequestAffiliationRequest;
};

type AffiliationActionOptions = {
  affiliationId: string;
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
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

const arrayBufferToBase64 = (arrayBuffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  const chunks: string[] = [];

  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + chunkSize)));
  }

  return btoa(chunks.join(""));
};

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

export const fetchAccountDocumentFileContents = async ({
  accountIdentifier,
  documentType,
  fallbackErrorMessage,
  fetchAdapter = fetch,
}: FetchAccountDocumentFileOptions): Promise<string> => {
  const documentPath = accountIdentifier
    ? `/api/account/accounts/${accountIdentifier}/documents/${encodeURIComponent(documentType)}`
    : `/api/account/my/documents/${encodeURIComponent(documentType)}`;
  const response = await fetchAdapter(documentPath, {
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw createRouteError(response, await readResponseBody(response), fallbackErrorMessage);
  }

  return arrayBufferToBase64(await response.arrayBuffer());
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


export const requestAccountCategoryChange = async ({
  accountIdentifier,
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
}: RequestAccountCategoryChangeOptions): Promise<AccountCategoryChangeRequestDetailResponse["request"]> => {
  const response = await fetchAdapter(`/api/account/accounts/${accountIdentifier}/category-change-requests`, {
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

  return parseAccountCategoryChangeRequestSummary(body);
};

export const fetchAccountCategoryChangeRequests = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  page = 1,
  perPage = 20,
  requestedAccountCategory,
  status = "pending",
}: ListAccountCategoryChangeRequestsOptions): Promise<ListAccountCategoryChangeRequestsResponse> => {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage), status });
  if (requestedAccountCategory) {
    params.set("requestedAccountCategory", requestedAccountCategory);
  }
  const response = await fetchAdapter(`/api/account/account-category-change-requests?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw createRouteError(response, body, fallbackErrorMessage);
  }

  return parseListAccountCategoryChangeRequestsResponse(body);
};

export const fetchAccountCategoryChangeRequestDetail = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestId,
}: AccountCategoryChangeRequestDetailOptions): Promise<AccountCategoryChangeRequestDetailResponse> => {
  const response = await fetchAdapter(`/api/account/account-category-change-requests/${encodeURIComponent(requestId)}`, {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw createRouteError(response, body, fallbackErrorMessage);
  }

  return parseAccountCategoryChangeRequestDetailResponse(body);
};

export const approveAccountCategoryChangeRequest = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestId,
}: AccountCategoryChangeRequestDetailOptions): Promise<AccountCategoryChangeRequestDetailResponse["request"]> => {
  const response = await fetchAdapter(`/api/account/account-category-change-requests/${encodeURIComponent(requestId)}/approve`, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw createRouteError(response, body, fallbackErrorMessage);
  }

  return parseAccountCategoryChangeRequestSummary(body);
};

export const rejectAccountCategoryChangeRequest = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
  requestId,
}: RejectAccountCategoryChangeRequestOptions): Promise<AccountCategoryChangeRequestDetailResponse["request"]> => {
  const response = await fetchAdapter(`/api/account/account-category-change-requests/${encodeURIComponent(requestId)}/reject`, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw createRouteError(response, body, fallbackErrorMessage);
  }

  return parseAccountCategoryChangeRequestSummary(body);
};


export const requestAffiliation = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
}: RequestAffiliationOptions): Promise<AffiliationSummary> => {
  const response = await fetchAdapter("/api/account/affiliations", {
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

  return parseAffiliationSummary(body);
};

export const approveAffiliation = async ({
  affiliationId,
  fallbackErrorMessage,
  fetchAdapter = fetch,
}: AffiliationActionOptions): Promise<AffiliationSummary> => {
  const response = await fetchAdapter(`/api/account/affiliations/${encodeURIComponent(affiliationId)}/approve`, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw createRouteError(response, body, fallbackErrorMessage);
  }

  return parseAffiliationSummary(body);
};

export const rejectAffiliation = async ({
  affiliationId,
  fallbackErrorMessage,
  fetchAdapter = fetch,
}: AffiliationActionOptions): Promise<void> => {
  const response = await fetchAdapter(`/api/account/affiliations/${encodeURIComponent(affiliationId)}/reject`, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw createRouteError(response, body, fallbackErrorMessage);
  }
};
