import type { Locale } from "@/i18n/locales";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import { getLocalizedAdministrativeAreaLabel } from "../account/profile/accountAdministrativeAreaLabels";
import { regionBoundary } from "./regionalProjection";
export const regionName = (
  code: string | null,
  locale: string,
  t: AnalyzeReportDictionary,
) =>
  code === null
    ? t.unknownRegion
    : `${getLocalizedAdministrativeAreaLabel(code, locale as Locale, regionBoundary(code)?.name ?? code)} (${code})`;
