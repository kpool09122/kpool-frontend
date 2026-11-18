import { buildPageMetadata } from "../metadata";
import { getRequestContext } from "../requestContext";

import { LoginPage } from "./LoginPage";

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo } = await searchParams;
  return <LoginPage returnTo={typeof returnTo === "string" ? returnTo : "/admin"} />;
}

export async function generateMetadata() {
  const { locale } = await getRequestContext();
  return buildPageMetadata(locale, "login");
}
