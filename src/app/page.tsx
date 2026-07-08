import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import {
  appCountryHeaderName,
  localeCookieName,
  resolveWikiListLocale,
} from "../i18n/locales";

export default async function Home() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authenticatedIdentity = await fetchAuthenticatedIdentity({
    cookieHeader: cookieStore.toString(),
  });
  const resolvedLanguage = resolveWikiListLocale({
    identityLanguage: authenticatedIdentity?.language,
    savedLocale: cookieStore.get(localeCookieName)?.value,
    country: headerStore.get(appCountryHeaderName),
  });

  redirect(`/${resolvedLanguage}`);
}
