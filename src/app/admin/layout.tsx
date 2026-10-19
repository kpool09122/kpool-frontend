import type { ReactNode } from "react";
import { AdminProvider } from "./AdminProvider";
import { AdminShellClient } from "./AdminShellClient";
import { loadAdminWikiPrincipalSnapshot } from "./adminWikiPrincipal";
import { loadAdminIdentity } from "./adminIdentity";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const initialIdentity = await loadAdminIdentity();
  // The page redirects unauthenticated requests with their exact return destination.
  if (!initialIdentity) return children;

  const snapshot = await loadAdminWikiPrincipalSnapshot();

  return (
    <AdminProvider initialIdentity={initialIdentity} initialPrincipalState={snapshot.state} principalStateUpdatedAt={snapshot.updatedAt}>
      <AdminShellClient>{children}</AdminShellClient>
    </AdminProvider>
  );
}
