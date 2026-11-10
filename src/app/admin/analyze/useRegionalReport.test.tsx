import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PropsWithChildren } from "react";
import { useRegionalReport } from "./useRegionalReport";
const fetch = vi.hoisted(() => vi.fn());
vi.mock("@/gateways/analyze/analyzeReports", () => ({
  getAnalyzeRegionalReport: fetch,
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("separates region, conditions, kind and authentication scope and cancels stale requests", async () => {
  const client = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const pending: { resolve: (v: unknown) => void; signal: AbortSignal }[] = [];
  fetch.mockImplementation(
    (_kind: string, _query: string, signal: AbortSignal) =>
      new Promise((resolve) => pending.push({ resolve, signal })),
  );
  const props = {
    kind: "wiki" as "app" | "wiki",
    query: "from=2026-01-01&language=ko&translationSetIdentifier=set",
    country: undefined as string | undefined,
    region: undefined as string | null | undefined,
    scope: "account-a",
    version: 1,
    revision: 0,
  };
  const hook = renderHook((p) => useRegionalReport(p), {
    initialProps: props,
    wrapper,
  });
  expect(fetch).not.toHaveBeenCalled();
  hook.rerender({ ...props, country: "JP", region: null });
  await waitFor(() => expect(pending).toHaveLength(1));
  expect(fetch.mock.calls[0][1]).toContain("region=unknown");
  expect(fetch.mock.calls[0][1]).toContain("translationSetIdentifier=set");
  hook.rerender({
    ...props,
    country: "JP",
    region: "JP-13",
    scope: "account-b",
    version: 2,
  });
  await waitFor(() => expect(pending).toHaveLength(2));
  expect(pending[0].signal.aborted).toBe(true);
  expect(hook.result.current.data).toBeUndefined();
  await act(async () =>
    pending[0].resolve({ status: "available", report: { old: true } }),
  );
  expect(hook.result.current.data).toBeUndefined();
  hook.rerender({
    ...props,
    kind: "app",
    country: "JP",
    query: "from=2026-02-01",
    version: 3,
  });
  await waitFor(() => expect(pending).toHaveLength(3));
  expect(pending[1].signal.aborted).toBe(true);
  const keys = client
    .getQueryCache()
    .getAll()
    .map((query) => query.queryKey);
  expect(
    keys.some(
      (key) =>
        key.includes("regional") && key.includes("app") && key.includes(3),
    ),
  ).toBe(true);
  hook.unmount();
  expect(pending.every((p) => p.signal.aborted)).toBe(true);
  client.clear();
});

it("fetches unknown-region reports independently of country-wide reports", async () => {
  const client = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  fetch.mockResolvedValue({ status: "error", httpStatus: 502 });
  const conditions = { kind: "wiki" as const, query: "from=2026-01-01", scope: "account-a", version: 1, revision: 0, country: "JP" };
  const hook = renderHook(() => {
    useRegionalReport(conditions);
    useRegionalReport({ ...conditions, region: null });
  }, { wrapper });
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch.mock.calls.map(([, query]) => new URLSearchParams(query).get("region"))).toEqual([null, "unknown"]);
  hook.unmount();
  client.clear();
});
