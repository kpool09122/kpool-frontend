import { createSitemapResponse } from "../sitemapResponse";

// No build-time snapshot or ISR stale serving: regenerate on each HTTP cache miss.
export const dynamic = "force-dynamic";
export const GET = () => createSitemapResponse();
