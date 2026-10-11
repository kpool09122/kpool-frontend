import type { ReactNode } from "react";
import { AdminProvider } from "./AdminProvider";
import { AdminShellClient } from "./AdminShellClient";
import { loadAdminIdentity } from "./adminIdentity";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const initialIdentity = await loadAdminIdentity();
  // The page redirects unauthenticated requests with their exact return destination.
  if (!initialIdentity) return children;

  return (
    <AdminProvider initialIdentity={initialIdentity}>
      <AdminShellClient>{children}</AdminShellClient>
    </AdminProvider>
  );
}
