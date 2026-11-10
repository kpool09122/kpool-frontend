"use client";
import { useCallback, useMemo, useState } from "react";
import { AccountStatusMessage } from "@/components/Account";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import { useRegionalReport } from "./useRegionalReport";
import { DomesticMap, type RegionalMapMetric } from "./DomesticMap";
import { RegionalMetricCard } from "./RegionalMetricCard";
import { isSelectableRegion } from "./regionalSelection";
import type {
  AppRegionalReport,
  WikiRegionalReport,
  ReportResult,
} from "@/gateways/analyze/analyzeReports";
const metrics = (
  appResult: ReportResult<AppRegionalReport> | undefined,
  wikiResult: ReportResult<WikiRegionalReport> | undefined,
  t: AnalyzeReportDictionary,
): RegionalMapMetric[] => [
  ...(appResult?.status === "available"
    ? (["applicationUsers", "registeredUsers"] as const).map((key) => ({
        key,
        name: t[key],
        group: t.app,
        report: appResult.report[key],
      }))
    : []),
  ...(wikiResult?.status === "available"
    ? (
        [
          "views",
          "viewers",
          "engagementTime",
          "submissions",
          "publications",
        ] as const
      ).map((key) => ({
        key,
        name: t[key],
        group: t.wiki,
        report: wikiResult.report[key],
        averageTime: key === "engagementTime",
      }))
    : []),
];

export function DomesticAnalysis({
  country,
  appQuery,
  wikiQuery,
  scope,
  version,
  revision,
  onBack,
  locale,
  t,
}: {
  country: string;
  appQuery: string;
  wikiQuery: string;
  scope: string;
  version: number;
  revision: number;
  onBack: () => void;
  locale: string;
  t: AnalyzeReportDictionary;
}) {
  const [region, setRegion] = useState<string | null | undefined>();
  const [level, setLevel] = useState("area");
  const app = useRegionalReport({
    kind: "app",
    query: appQuery,
    scope,
    version,
    revision,
    country,
  });
  const wiki = useRegionalReport({
    kind: "wiki",
    query: wikiQuery,
    scope,
    version,
    revision,
    country,
  });
  const areaApp = useRegionalReport({
    kind: "app",
    query: appQuery,
    scope,
    version,
    revision,
    country: region === undefined ? undefined : country,
    region,
  });
  const areaWiki = useRegionalReport({
    kind: "wiki",
    query: wikiQuery,
    scope,
    version,
    revision,
    country: region === undefined ? undefined : country,
    region,
  });
  const detailApp = region === undefined ? app : areaApp;
  const detailWiki = region === undefined ? wiki : areaWiki;
  const mapMetrics = useMemo(
    () => metrics(app.data, wiki.data, t),
    [app.data, wiki.data, t],
  );
  const selectedReports = new Map(
    metrics(detailApp.data, detailWiki.data, t).map((metric) => [metric.key, metric.report]),
  );
  const selectedMetrics = mapMetrics
    .filter((metric) => (metric.group === t.app ? detailApp.data : detailWiki.data)?.status !== "error")
    .map((metric) => ({ ...metric, report: selectedReports.get(metric.key) }));
  const errors = [app.data, wiki.data, detailApp.data, detailWiki.data].filter(
    (result) => result?.status === "error",
  );
  const authError = errors.find(
    (result) => result?.httpStatus === 401 || result?.httpStatus === 403,
  );
  const { refetch: refetchApp } = app;
  const { refetch: refetchWiki } = wiki;
  const selectRegion = useCallback((next: string | null | undefined) => {
    if (!isSelectableRegion(country, next)) return;
    setRegion(next);
    if (next === undefined && region !== undefined) {
      void refetchApp();
      void refetchWiki();
    }
  }, [country, region, refetchApp, refetchWiki]);
  return (
    <div className="min-w-0 space-y-4">
      {authError ? (
        <>
          <AccountStatusMessage variant="error">
            {authError.httpStatus === 401 ? t.unauthorized : t.forbidden}
          </AccountStatusMessage>
        </>
      ) : (
        <>
          <DomesticMap
            country={country}
            region={region}
            level={level}
            onLevelChange={setLevel}
            metrics={mapMetrics}
            summaries={selectedMetrics}
            onSelect={selectRegion}
            onBack={onBack}
            t={t}
            locale={locale}
          />
          {errors.length ? (
            <AccountStatusMessage variant="error">
              {errors.some(
                (result) => result && [400, 422].includes(result.httpStatus),
              )
                ? t.invalidRequest
                : t.httpError}
            </AccountStatusMessage>
          ) : null}
          {[t.app, t.wiki].map((group) => (
            <section
              key={group}
              aria-label={group}
              aria-busy={
                group === t.app ? detailApp.isFetching : detailWiki.isFetching
              }
              className="min-w-0 space-y-3"
            >
              <h3 className="text-xl font-semibold">{group}</h3>
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                {selectedMetrics
                  .filter((metric) => metric.group === group)
                  .map((metric) => (
                    <RegionalMetricCard
                      key={metric.key}
                      name={metric.name}
                      report={metric.report}
                      country={country}
                      level={level}
                      t={t}
                      locale={locale}
                      averageTime={metric.averageTime}
                      showSubmitters={metric.key === "submissions"}
                      totalLabel={
                        metric.key === "registeredUsers"
                          ? t.registeredUsers
                          : undefined
                      }
                      onSelect={selectRegion}
                      selectedRegion={region}
                    />
                  ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
