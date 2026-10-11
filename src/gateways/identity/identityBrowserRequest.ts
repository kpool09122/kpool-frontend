import { getBrowserDictionary } from "@/i18n/browserDictionary";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";

export type IdentityBrowserApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code?: string; message: string; status: number };

type RequestOptions = {
  body?: unknown;
  language?: string;
  method?: "DELETE" | "GET" | "PATCH" | "POST";
};

const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
};

const getMessage = (body: unknown, language?: string): string => {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }

  return getBrowserDictionary(language).common.authenticationFailed;
};

const getCode = (body: unknown): string | undefined =>
  typeof body === "object" && body !== null && "code" in body
    && typeof (body as { code: unknown }).code === "string"
    ? (body as { code: string }).code
    : undefined;

export const requestIdentity = async <T>(
  url: string,
  parseResponse: (body: unknown) => T,
  { body, language, method = "POST" }: RequestOptions = {},
): Promise<IdentityBrowserApiResult<T>> => {
  try {
    const response = await browserApiFetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(language ? { "Accept-Language": language } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      credentials: "include",
      cache: "no-store",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const responseBody = await readBody(response);

    if (!response.ok) {
      return {
        ok: false,
        code: getCode(responseBody),
        message: getMessage(responseBody, language),
        status: response.status,
      };
    }

    return { ok: true, data: parseResponse(responseBody) };
  } catch {
    return {
      ok: false,
      message: getBrowserDictionary(language).common.authenticationFailed,
      status: 0,
    };
  }
};

