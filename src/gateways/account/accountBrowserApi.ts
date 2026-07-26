import { parseAccountSummary, parseInvitationSummaries, type AccountSummary, type InvitationSummary, type InviteAccountMembersRequest, type UpdateAccountRequest } from "./accountApi";

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
