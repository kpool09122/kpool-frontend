import { WikiDetailPage } from "./WikiDetailPage";

type WikiDetailRouteProps = {
  params: Promise<{
    wikiId: string;
  }>;
};

export default async function Page({ params }: WikiDetailRouteProps) {
  const { wikiId } = await params;

  return <WikiDetailPage wikiId={wikiId} />;
}
