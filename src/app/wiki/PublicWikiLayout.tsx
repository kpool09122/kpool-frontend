import type { ReactNode } from "react";
import { loadPublicWikiRouteState } from "./publicWikiRoute";

export async function PublicWikiLayout({ children, params }: {
  children: ReactNode;
  params: PromiseLike<{ language: string; slug: string }>;
}) {
  const { language, slug } = await params;
  // Check before this route's loading boundary can begin a 200 response.
  await loadPublicWikiRouteState(language, slug);
  return children;
}
