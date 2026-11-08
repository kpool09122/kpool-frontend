import { analyzeApiTypes } from "@kpool/types";
import { z } from "zod";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
export type MetricReport = z.infer<typeof analyzeApiTypes.schemas.MetricReport>;
export type AppReport = z.infer<
  typeof analyzeApiTypes.schemas.AppDailySummaryReport
>;
export type WikiReport = z.infer<
  typeof analyzeApiTypes.schemas.WikiDailySummaryReport
>;
export type ReportResult<T> =
  | { status: "available"; report: T }
  | { status: "error"; httpStatus: number };
export async function getAnalyzeReport<K extends "app" | "wiki">(
  kind: K,
  query: string,
  signal?: AbortSignal,
): Promise<ReportResult<K extends "app" ? AppReport : WikiReport>> {
  try {
    const response = await browserApiFetch(
      `/api/analyze/${kind}/daily-summary?${query}`,
      { credentials: "include", cache: "no-store", signal },
    );
    if (!response.ok) return { status: "error", httpStatus: response.status };
    const schema =
      kind === "app"
        ? analyzeApiTypes.schemas.AppDailySummaryReport
        : analyzeApiTypes.schemas.WikiDailySummaryReport;
    const parsed = schema.safeParse(await response.json());
    return parsed.success
      ? {
          status: "available",
          report: parsed.data as K extends "app" ? AppReport : WikiReport,
        }
      : { status: "error", httpStatus: 502 };
  } catch {
    return { status: "error", httpStatus: 502 };
  }
}
