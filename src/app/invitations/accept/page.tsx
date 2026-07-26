import { InvitationAcceptPage } from "./InvitationAcceptPage";

type InvitationAcceptRouteProps = {
  searchParams: Promise<{
    token?: string | string[];
    email?: string | string[];
  }>;
};

const getSingleSearchParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

export default async function Page({ searchParams }: InvitationAcceptRouteProps) {
  const params = await searchParams;

  return (
    <InvitationAcceptPage
      token={getSingleSearchParam(params.token)}
      email={getSingleSearchParam(params.email)}
    />
  );
}
