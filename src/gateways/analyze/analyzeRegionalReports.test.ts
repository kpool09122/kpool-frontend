import { afterEach, expect, it, vi } from "vitest";
import { getAnalyzeRegionalReport } from "./analyzeReports";
import { appReport, wikiReport } from "../../../tests/fixtures/analyzeReports";
const fetchMock = vi.fn();
vi.mock("@/gateways/support/browserApiFetch", () => ({
  browserApiFetch: (...args: unknown[]) => fetchMock(...args),
}));
afterEach(() => vi.resetAllMocks());
import { regionalize } from "../../../tests/fixtures/analyzeRegionalReports";
it.each(["app", "wiki"] as const)(
  "uses the dedicated %s contract and accepts unmapped valid codes without changing totals",
  async (kind) => {
    const data = regionalize(kind === "app" ? appReport : wikiReport);
    fetchMock.mockResolvedValue(Response.json(data));
    const signal = new AbortController().signal;
    const result = await getAnalyzeRegionalReport(
      kind,
      "country=JP&region=JP-13&from=2026-01-01",
      signal,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/analyze/${kind}/regional-daily-summary?country=JP&region=JP-13&from=2026-01-01`,
      { credentials: "include", cache: "no-store", signal },
    );
    expect(result).toEqual({ status: "available", report: data });
  },
);
it("rejects malformed regional payloads", async () => {
  fetchMock.mockResolvedValue(Response.json(appReport));
  expect(await getAnalyzeRegionalReport("app", "country=JP")).toEqual({
    status: "error",
    httpStatus: 502,
  });
});
it.each([401, 403, 422, 500])(
  "retains HTTP %i without exposing a backend body",
  async (status) => {
    fetchMock.mockResolvedValue(Response.json({ trace: "secret" }, { status }));
    expect(await getAnalyzeRegionalReport("wiki", "country=JP")).toEqual({
      status: "error",
      httpStatus: status,
    });
  },
);
