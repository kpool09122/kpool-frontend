import { createSitemapResponse } from "../../sitemapResponse";

export const dynamic = "force-dynamic";
export const GET = async (
  _request: Request,
  { params }: RouteContext<"/sitemaps/[file]">,
) => {
  const { file } = await params;
  if (
    !/^(0|[1-9]\d*)\.xml$/.test(file) ||
    !Number.isSafeInteger(Number(file.slice(0, -4)))
  ) {
    return new Response("Not found.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return createSitemapResponse(Number(file.slice(0, -4)));
};
