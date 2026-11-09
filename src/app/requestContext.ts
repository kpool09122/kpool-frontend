import { cache } from "react";
import { cookies, headers } from "next/headers";
import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import {
  appCountryHeaderName,
  appRouteLocaleHeaderName,
  localeCookieName,
  resolveLocale,
} from "@/i18n/locales";

// Share the same language and identity between page metadata and the root layout.
export const getRequestContext = cache(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authenticatedIdentity = await fetchAuthenticatedIdentity({
    cookieHeader: cookieStore.toString(),
  });
  const locale = resolveLocale({
    routeLocale: headerStore.get(appRouteLocaleHeaderName),
    identityLanguage: authenticatedIdentity?.language,
    savedLocale: cookieStore.get(localeCookieName)?.value,
    country: headerStore.get(appCountryHeaderName),
  });
  return { locale, authenticatedIdentity };
});
