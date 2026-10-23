import { afterEach, expect, it, vi } from "vitest";
import { createWikiVideo } from "./wikiVideoCreate";
const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/gateways/support/browserApiFetch", () => ({
  browserApiFetch: fetcher,
}));
const body = {
  resourceType: "group" as const,
  wikiIdentifier: "11111111-1111-4111-8111-111111111111",
  url: "https://youtu.be/Os_heh8vPfs?list=ignore",
  videoUsage: "live" as const,
  title: "Title",
  displayOrder: 2,
  durationSeconds: 200,
};
afterEach(() => vi.resetAllMocks());
it("posts one normalized payload with credentials to BFF and accepts empty 204", async () => {
  fetcher.mockResolvedValue(new Response(null, { status: 204 }));
  expect(await createWikiVideo(body)).toEqual({ ok: true, status: 204 });
  expect(fetcher).toHaveBeenCalledWith(
    "/api/wiki/videos/create",
    expect.objectContaining({ method: "POST", credentials: "include" }),
  );
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    ...body,
    url: "https://www.youtube.com/watch?v=Os_heh8vPfs",
  });
});
it.each([401, 403, 409, 422, 500])(
  "returns safe status %i without trusting backend messages",
  async (status) => {
    fetcher.mockResolvedValue(Response.json({ message: "secret" }, { status }));
    expect(await createWikiVideo(body)).toEqual({ ok: false, status });
  },
);
it("handles network errors and refuses zero metadata", async () => {
  fetcher.mockRejectedValue(new Error("network"));
  expect(await createWikiVideo(body)).toEqual({ ok: false, status: 0 });
  fetcher.mockClear();
  expect(await createWikiVideo({ ...body, durationSeconds: 0 })).toEqual({
    ok: false,
    status: 422,
  });
  expect(fetcher).not.toHaveBeenCalled();
});
