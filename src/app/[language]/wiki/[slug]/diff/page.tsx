import { redirect } from "next/navigation";

type WikiDiffRouteProps = {
  params: Promise<{
    language: string;
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: WikiDiffRouteProps) {
  await params;
  redirect("/mypage");
}
