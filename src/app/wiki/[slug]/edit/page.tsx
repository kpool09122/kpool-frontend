import { WikiEditPage } from "./WikiEditPage";

type WikiEditRouteProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    themeColor?: string | string[];
  }>;
};

const getThemeColor = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function Page({ params, searchParams }: WikiEditRouteProps) {
  const { slug } = await params;
  const { themeColor } = await searchParams;

  return <WikiEditPage slug={slug} themeColor={getThemeColor(themeColor)} />;
}
