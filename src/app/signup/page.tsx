import { buildPageMetadata } from "../metadata";
import { getRequestContext } from "../requestContext";

import { SignupPage } from "./SignupPage";

export default function Page() {
  return <SignupPage />;
}

export async function generateMetadata() {
  const { locale } = await getRequestContext();
  return buildPageMetadata(locale, "signup");
}
