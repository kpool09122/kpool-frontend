import { getApiErrorMessage, readApiErrorBody } from "./apiError";
import { getBrowserDictionary } from "@/i18n/browserDictionary";

const csrfEndpoint = "/api/identity/auth/csrf-token";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
let csrfInitialization: Promise<void> | undefined;

const readCsrfCookie = (): string | undefined => {
  const cookie = document.cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith("XSRF-TOKEN="));

  if (!cookie) return undefined;

  try {
    return decodeURIComponent(cookie.slice("XSRF-TOKEN=".length)) || undefined;
  } catch {
    return undefined;
  }
};

const initializeCsrf = async (): Promise<void> => {
  if (!csrfInitialization) {
    csrfInitialization = fetch(csrfEndpoint, {
      credentials: "same-origin",
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) {
        const body = await readApiErrorBody(response);
        throw Object.assign(new Error(getApiErrorMessage(body, getBrowserDictionary().common.csrfFailed)), {
          response: { status: response.status, data: body },
        });
      }
    }).finally(() => {
      csrfInitialization = undefined;
    });
  }

  await csrfInitialization;
};

export const browserApiFetch: typeof fetch = async (input, init) => {
  const request = input instanceof Request ? input : undefined;
  const url = new URL(request?.url ?? String(input), window.location.origin);
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();

  if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
    throw new Error("Browser API requests must target the same-origin API.");
  }

  if (safeMethods.has(method)) return init === undefined ? fetch(input) : fetch(input, init);

  if (!readCsrfCookie()) await initializeCsrf();
  const token = readCsrfCookie();
  if (!token) throw new Error(getBrowserDictionary().common.csrfFailed);

  const sourceHeaders = init?.headers ?? request?.headers;
  const headers = sourceHeaders instanceof Headers || Array.isArray(sourceHeaders)
    ? Object.fromEntries(new Headers(sourceHeaders))
    : { ...sourceHeaders };

  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() === "x-xsrf-token") delete headers[name];
  }

  return fetch(input, {
    ...init,
    headers: { ...headers, "X-XSRF-TOKEN": token },
  });
};
