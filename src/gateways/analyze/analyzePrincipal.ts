import { analyzeApiTypes } from "@kpool/types";
import { z } from "zod";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";

export type AnalyzePrincipal = z.infer<
  typeof analyzeApiTypes.schemas.PrincipalSnapshot
>;
export type AnalyzeResult =
  | { status: "available"; principal: AnalyzePrincipal }
  | { status: "missing" }
  | { status: "error"; httpStatus: number };
export const canViewAnalysis = (principal: AnalyzePrincipal) => {
  const statements = principal.policies
    .flatMap((policy) => policy.statements)
    .filter(
      (statement) =>
        statement.actions.includes("analysis:view") &&
        statement.resourceTypes.includes("analysis"),
    );
  return (
    principal.status === "active" &&
    statements.some((statement) => statement.effect === "allow") &&
    !statements.some((statement) => statement.effect === "deny")
  );
};
export async function getAnalyzePrincipal(
  signal?: AbortSignal,
): Promise<AnalyzeResult> {
  try {
    const response = await browserApiFetch("/api/analyze/principal/me", {
      credentials: "include",
      cache: "no-store",
      signal,
    });
    if (response.status === 404) return { status: "missing" };
    if (!response.ok) return { status: "error", httpStatus: response.status };
    const parsed = analyzeApiTypes.schemas.PrincipalSnapshot.safeParse(
      await response.json(),
    );
    return parsed.success
      ? { status: "available", principal: parsed.data }
      : { status: "error", httpStatus: 502 };
  } catch {
    return { status: "error", httpStatus: 502 };
  }
}
export async function enableAnalyze() {
  try {
    const response = await browserApiFetch("/api/analyze/principals", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    if (response.status === 409) return { status: "duplicate" as const };
    if (!response.ok)
      return { status: "error" as const, httpStatus: response.status };
    const parsed = analyzeApiTypes.schemas.PrincipalSummary.safeParse(
      await response.json(),
    );
    return parsed.success
      ? { status: "created" as const }
      : { status: "error" as const, httpStatus: 502 };
  } catch {
    return { status: "error" as const, httpStatus: 502 };
  }
}
