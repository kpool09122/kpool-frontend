import { redirect } from "next/navigation";

import { MypageRoutePage } from "./MypageRoutePage";

export const dynamic = "force-dynamic";

type MyPageProps = {
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
};

const getSingleSearchParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const normalizeOptionalReturnTo = (value: string | undefined): string | null =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

export default async function MyPage({ searchParams }: MyPageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnTo = normalizeOptionalReturnTo(
    getSingleSearchParam(resolvedSearchParams.returnTo),
  );

  if (!returnTo) {
    redirect("/mypage/wiki/editing");
  }

  return MypageRoutePage({
    loginReturnTo: "/mypage",
    returnTo,
    section: "wiki",
    wikiTab: "editingWikis",
  });
}
