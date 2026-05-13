import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAuthenticatedIdentity } from "../../../../authIdentity";
import { loadDraftWikiState } from "../../../draftWiki";
import { WikiEditPage } from "../../../[slug]/edit/WikiEditPage";
import { getCurrentWikiPrincipalForRequest } from "../../../wikiPrincipal";
import { buildWikiEditPath } from "../../../wikiRouting";

type WikiEditRouteProps = {
  params: Promise<{
    language: string;
    slug: string;
  }>;
  searchParams: Promise<{
    authGate?: string | string[];
    themeColor?: string | string[];
  }>;
};

const getSingleSearchParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const buildGatedEditReturnPath = ({
  editPath,
  themeColor,
}: {
  editPath: string;
  themeColor?: string;
}): string => {
  const params = new URLSearchParams({ authGate: "1" });

  if (themeColor) {
    params.set("themeColor", themeColor);
  }

  return `${editPath}?${params.toString()}`;
};

export default async function Page({ params, searchParams }: WikiEditRouteProps) {
  const { language, slug } = await params;
  const { authGate, themeColor } = await searchParams;
  const normalizedThemeColor = getSingleSearchParam(themeColor);
  const editPath = buildWikiEditPath(language, slug);
  const shouldGateEditAccess = getSingleSearchParam(authGate) === "1";

  if (shouldGateEditAccess) {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const authenticatedIdentity = await fetchAuthenticatedIdentity({
      cookieHeader,
    });

    if (!authenticatedIdentity) {
      redirect(
        `/login?returnTo=${encodeURIComponent(
          buildGatedEditReturnPath({ editPath, themeColor: normalizedThemeColor }),
        )}`,
      );
    }

    const principalState = await getCurrentWikiPrincipalForRequest({
      cookieHeader,
    });

    if (principalState.status === "missing") {
      redirect("/mypage");
    }

    if (principalState.status === "error") {
      return (
        <WikiEditPage
          language={language}
          slug={slug}
          themeColor={normalizedThemeColor}
          wikiState={{
            status: "error",
            message: principalState.message,
          }}
        />
      );
    }
  }

  const wikiState = await loadDraftWikiState(language, slug);

  return (
    <WikiEditPage
      language={language}
      slug={slug}
      themeColor={normalizedThemeColor}
      wikiState={wikiState}
    />
  );
}
