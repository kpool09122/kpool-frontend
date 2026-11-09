import { buildPageMetadata } from "../metadata";
import { getRequestContext } from "../requestContext";

import { LoginPage } from "./LoginPage";

export default function Page() {
  return <LoginPage />;
}

export async function generateMetadata() {
  const { locale } = await getRequestContext();
  return buildPageMetadata(locale, "login");
}
