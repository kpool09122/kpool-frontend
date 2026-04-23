import { loadDraftWikiState } from "../../../draftWiki";
import { WikiEditPage } from "../../../[slug]/edit/WikiEditPage";

type WikiEditRouteProps = {
  params: Promise<{
    language: string;
    slug: string;
  }>;
  searchParams: Promise<{
    themeColor?: string | string[];
  }>;
};

const getThemeColor = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function Page({ params, searchParams }: WikiEditRouteProps) {
  const { language, slug } = await params;
  const { themeColor } = await searchParams;
  const wikiState = await loadDraftWikiState(language, slug);

  return (
    <WikiEditPage
      language={language}
      slug={slug}
      themeColor={getThemeColor(themeColor)}
      wikiState={wikiState}
    />
  );
}
