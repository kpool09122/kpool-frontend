import { redirect } from "next/navigation";

import { MypageAppClient } from "./MypageAppClient";
import { loadMypageRouteContext } from "../mypageRouteContext";

export const dynamic = "force-dynamic";

type MyPageProps = {
  params?: Promise<{
    slug?: string[];
  }>;
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
};

const getSingleSearchParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const normalizeOptionalReturnTo = (value: string | undefined): string | null =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

const buildLoginReturnTo = (slug: string[] | undefined): string =>
  slug && slug.length > 0 ? `/mypage/${slug.join("/")}` : "/mypage";

export default async function MyPage({ params, searchParams }: MyPageProps = {}) {
  const resolvedParams = params ? await params : {};
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnTo = normalizeOptionalReturnTo(
    getSingleSearchParam(resolvedSearchParams.returnTo),
  );

  if (!returnTo && (!resolvedParams.slug || resolvedParams.slug.length === 0)) {
    redirect("/mypage/wiki/editing");
  }

  const context = await loadMypageRouteContext(buildLoginReturnTo(resolvedParams.slug));

  return <MypageAppClient context={context} returnTo={returnTo} />;
}
