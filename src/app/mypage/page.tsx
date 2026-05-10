import { cookies } from "next/headers";

import { fetchAuthenticatedIdentity } from "../authIdentity";
import { MyPageClient } from "./MyPageClient";

export default async function MyPage() {
  const cookieStore = await cookies();
  const authenticatedIdentity = await fetchAuthenticatedIdentity({
    cookieHeader: cookieStore.toString(),
  });

  return <MyPageClient initialIdentity={authenticatedIdentity} />;
}
