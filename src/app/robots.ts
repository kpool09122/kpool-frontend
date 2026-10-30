import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "@/config/publicSite";

export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
