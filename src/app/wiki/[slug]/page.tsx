import { WikiDetailPage } from "./WikiDetailPage";

type WikiDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    themeColor?: string | string[];
  }>;
};

const getThemeColor = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function Page({ params, searchParams }: WikiDetailRouteProps) {
  const { slug } = await params;
  const { themeColor } = await searchParams;

  return <WikiDetailPage slug={slug} themeColor={getThemeColor(themeColor)} />;
}
