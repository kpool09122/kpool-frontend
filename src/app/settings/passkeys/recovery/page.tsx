import { PasskeyRecoveryPage } from "./PasskeyRecoveryPage";

type PageProps = {
  searchParams: Promise<{ recoveryKey?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { recoveryKey } = await searchParams;

  return <PasskeyRecoveryPage initialRecoveryKey={recoveryKey ?? null} />;
}
