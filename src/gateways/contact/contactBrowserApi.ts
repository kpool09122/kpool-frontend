import {
  parseMyContactDetailResponse,
  parseMyContactsResponse,
  parseSubmitContactResponse,
  type MyContactDetail,
  type MyContactSummary,
  type SubmitContactRequest,
  type SubmitContactResponse,
} from "./contactApi";

export type SubmitContactResult =
  | { ok: true; contact: SubmitContactResponse }
  | { ok: false };

export type SubmitContactAdapter = (options: {
  locale: string;
  requestBody: SubmitContactRequest;
}) => Promise<SubmitContactResult>;

export const submitContact: SubmitContactAdapter = async ({ locale, requestBody }) => {
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Language": locale,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return { ok: false };
    }

    return {
      ok: true,
      contact: parseSubmitContactResponse(await response.json()),
    };
  } catch {
    return { ok: false };
  }
};

export type ContactBrowserApiError = Error & { contactRouteStatus: number };

type FetchOptions = { fallbackErrorMessage: string; fetchAdapter?: typeof fetch };

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getRouteError = (response: Response, body: unknown, fallbackErrorMessage: string): ContactBrowserApiError =>
  Object.assign(
    new Error(
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : fallbackErrorMessage,
    ),
    { contactRouteStatus: response.status },
  );

export const fetchMyContacts = async ({ fallbackErrorMessage, fetchAdapter = fetch }: FetchOptions): Promise<MyContactSummary[]> => {
  const response = await fetchAdapter("/api/site-management/contact/me", {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);
  if (!response.ok) throw getRouteError(response, body, fallbackErrorMessage);
  return parseMyContactsResponse(body);
};

export const fetchMyContactDetail = async ({
  contactIdentifier,
  fallbackErrorMessage,
  fetchAdapter = fetch,
}: FetchOptions & { contactIdentifier: string }): Promise<MyContactDetail> => {
  const response = await fetchAdapter(`/api/site-management/contact/me/${encodeURIComponent(contactIdentifier)}`, {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);
  if (!response.ok) throw getRouteError(response, body, fallbackErrorMessage);
  return parseMyContactDetailResponse(body);
};
