import { cache } from "react";
import { cookies } from "next/headers";
import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";

// Share the identity snapshot between the persistent layout and route data loading.
export const loadAdminIdentity = cache(async () => {
  const cookieStore = await cookies();
  return fetchAuthenticatedIdentity({ cookieHeader: cookieStore.toString() });
});
