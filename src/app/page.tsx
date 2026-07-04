import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import { localeCookieName, resolveWikiListLocale } from "../i18n/locales";

export default async function Home() {
  const cookieStore = await cookies();
  const authenticatedIdentity = await fetchAuthenticatedIdentity({
    cookieHeader: cookieStore.toString(),
  });
  const resolvedLanguage = resolveWikiListLocale({
    identityLanguage: authenticatedIdentity?.language,
    savedLocale: cookieStore.get(localeCookieName)?.value,
  });

  redirect(`/${resolvedLanguage}`);
}
