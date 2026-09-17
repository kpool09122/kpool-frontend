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
