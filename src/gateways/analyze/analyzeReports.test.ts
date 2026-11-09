import { afterEach, expect, it, vi } from "vitest";
import { getAnalyzeReport } from "./analyzeReports";
import { appReport, wikiReport } from "../../../tests/fixtures/analyzeReports";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/gateways/support/browserApiFetch", () => ({
  browserApiFetch: (...args: unknown[]) => mocks.fetch(...args),
}));
afterEach(() => mocks.fetch.mockReset());
it.each(["app", "wiki"] as const)(
  "validates the generated %s contract, credentials and cancellation",
  async (kind) => {
    const report = kind === "app" ? appReport : wikiReport;
    const signal = new AbortController().signal;
    mocks.fetch.mockResolvedValue(Response.json(report));
    expect(
      await getAnalyzeReport(kind, "from=2020-01-01&to=2020-01-04", signal),
    ).toEqual({ status: "available", report });
    expect(mocks.fetch).toHaveBeenCalledWith(
      `/api/analyze/${kind}/daily-summary?from=2020-01-01&to=2020-01-04`,
      { credentials: "include", cache: "no-store", signal },
    );
  },
);
it.each([400, 401, 403, 422, 500, 503])(
  "returns HTTP %i separately from metric availability",
  async (status) => {
    mocks.fetch.mockResolvedValue(
      Response.json({ exception: "secret" }, { status }),
    );
    expect(await getAnalyzeReport("wiki", "")).toEqual({
      status: "error",
      httpStatus: status,
    });
  },
);
it.each([{}, "invalid json", { views: { total: 0 } }])(
  "rejects malformed success without fabricating zeros",
  async (body) => {
    mocks.fetch.mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body)),
    );
    expect(await getAnalyzeReport("wiki", "")).toEqual({
      status: "error",
      httpStatus: 502,
    });
  },
);
it("handles network failure", async () => {
  mocks.fetch.mockRejectedValue(new Error("secret"));
  expect(await getAnalyzeReport("app", "")).toEqual({
    status: "error",
    httpStatus: 502,
  });
});
