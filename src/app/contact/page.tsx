import { buildPageMetadata } from "../metadata";
import { getRequestContext } from "../requestContext";

import { cookies } from "next/headers";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import { ContactPage } from "./ContactPage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  const identity = await fetchAuthenticatedIdentity({
    cookieHeader: cookieStore.toString(),
  });

  return (
    <ContactPage
      initialEmail={identity?.email ?? ""}
      initialName={identity?.identityName ?? ""}
    />
  );
}

export async function generateMetadata() {
  const { locale } = await getRequestContext();
  return buildPageMetadata(locale, "contact");
}
