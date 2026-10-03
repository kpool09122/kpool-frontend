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
    }).then((response) => {
      if (!response.ok) throw new Error("CSRF initialization failed.");
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
  if (!token) throw new Error("CSRF cookie is unavailable.");

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
