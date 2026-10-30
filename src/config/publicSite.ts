import { z } from "zod";

// Server-side configuration: never derive canonical URLs from request Host headers.
export const getPublicSiteOrigin = (): string | null => {
  const parsed = z
    .string()
    .url()
    .safeParse(process.env.KPOOL_PUBLIC_SITE_URL ?? "https://k-pool.app");
  if (!parsed.success) return null;
  const url = new URL(parsed.data);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    return null;
  return url.origin;
};
