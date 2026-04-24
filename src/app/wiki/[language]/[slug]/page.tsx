import { WikiDetailPage } from "../../[slug]/WikiDetailPage";

type WikiDetailRouteProps = {
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

export default async function Page({ params, searchParams }: WikiDetailRouteProps) {
  const { language, slug } = await params;
  const { themeColor } = await searchParams;

  return (
    <WikiDetailPage
      language={language}
      slug={slug}
      themeColor={getThemeColor(themeColor)}
    />
  );
}
