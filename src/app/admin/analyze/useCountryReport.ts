import { useQuery } from "@tanstack/react-query";
import { getAnalyzeReport, type AppReport, type WikiReport, type ReportResult } from "@/gateways/analyze/analyzeReports";

type Result<K extends "app" | "wiki"> = ReportResult<K extends "app" ? AppReport : WikiReport>;

export function useCountryReport<K extends "app" | "wiki">({ kind, query, scope, version, country, globalResult }: {
  kind: K;
  query: string;
  scope: string;
  version: number;
  country: string | null | undefined;
  globalResult: Result<K> | undefined;
}) {
  const params = new URLSearchParams(query);
  if (country !== undefined) params.set("country", country ?? "unknown");
  return useQuery({
    queryKey: ["admin", "analyze", kind, scope, version, query, country === undefined ? "all" : country ?? "unknown"],
    queryFn: async ({ signal }) => ({ country, result: await getAnalyzeReport(kind, params.toString(), signal) }),
    enabled: country !== undefined,
    // Keep the report and its country together so old values never acquire the new country's label.
    placeholderData: (previous, previousQuery) => {
      const key = previousQuery?.queryKey;
      if (previous && key?.[3] === scope && key[4] === version && key[5] === query) return previous;
      if (globalResult?.status === "available") return { country: undefined, result: globalResult };
      return undefined;
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: "always",
  });
}
