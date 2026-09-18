import { NextResponse, type NextRequest } from "next/server";

import {
  appCountryHeaderName,
  appRouteLocaleHeaderName,
  isSupportedLocale,
  normalizeCountryCode,
} from "./i18n/locales";

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
  const routeLocale = request.nextUrl.pathname.split("/")[1];

  if (country === null && !isSupportedLocale(routeLocale)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  if (country !== null) {
    requestHeaders.set(appCountryHeaderName, country);
  }
  if (isSupportedLocale(routeLocale)) {
    requestHeaders.set(appRouteLocaleHeaderName, routeLocale);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
