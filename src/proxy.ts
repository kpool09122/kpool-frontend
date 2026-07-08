import { NextResponse, type NextRequest } from "next/server";

import { appCountryHeaderName, normalizeCountryCode } from "./i18n/locales";

const cloudflareCountryHeaderName = "cf-ipcountry";
const vercelCountryHeaderName = "x-vercel-ip-country";

type RequestWithCloudflareGeo = NextRequest & {
  cf?: {
    country?: unknown;
  };
};

const resolveInfrastructureCountry = (request: NextRequest): string | null =>
  normalizeCountryCode(request.headers.get(appCountryHeaderName)) ??
  normalizeCountryCode((request as RequestWithCloudflareGeo).cf?.country) ??
  normalizeCountryCode(request.headers.get(cloudflareCountryHeaderName)) ??
  normalizeCountryCode(request.headers.get(vercelCountryHeaderName));

export function proxy(request: NextRequest) {
  const country = resolveInfrastructureCountry(request);

  if (country === null) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(appCountryHeaderName, country);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
