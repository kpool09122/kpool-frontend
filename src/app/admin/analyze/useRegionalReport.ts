import { useQuery } from "@tanstack/react-query";
import { getAnalyzeRegionalReport } from "@/gateways/analyze/analyzeReports";
export function useRegionalReport<K extends "app" | "wiki">({
  kind,
  query,
  scope,
  version,
  revision,
  country,
  region,
}: {
  kind: K;
  query: string;
  scope: string;
  version: number;
  revision: number;
  country?: string;
  region?: string | null;
}) {
  const params = new URLSearchParams(query);
  if (country) params.set("country", country);
  if (region !== undefined) params.set("region", region ?? "unknown");
  return useQuery({
    queryKey: [
      "admin",
      "analyze",
      "regional",
      kind,
      scope,
      version,
      query,
      country,
      region === undefined ? "all" : region ?? "unknown",
      revision,
    ],
    queryFn: ({ signal }) =>
      getAnalyzeRegionalReport(kind, params.toString(), signal),
    enabled: !!country,
    // Do not relabel an old region/period/account's values while its successor loads.
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: "always",
  });
}
