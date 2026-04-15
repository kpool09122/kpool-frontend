import { WikiDetailPage } from "./WikiDetailPage";

type WikiDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function Page({ params }: WikiDetailRouteProps) {
  const { slug } = await params;

  return <WikiDetailPage slug={slug} />;
}
