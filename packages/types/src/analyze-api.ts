import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const MetricDefinition = z
  .object({
    source: z.string(),
    metric: z.string(),
    grain: z.string(),
    version: z.string(),
  })
  .passthrough();
const MetricDay = z
  .object({
    day: z.string(),
    availability: z.enum([
      "measured",
      "not_collected",
      "missing",
      "incomplete",
    ]),
    value: z.string().nullable(),
    denominator: z.number().int().nullable(),
    quality: z.array(z.string()),
    updatedAt: z.string().nullable(),
    actorCount: z.string().nullish(),
  })
  .passthrough();
const CountryMetric = z
  .object({
    country: z.string().nullable(),
    value: z.string().nullable(),
    denominator: z.number().int().nullable(),
    quality: z.array(z.string()),
    actorCount: z.string().nullish(),
  })
  .passthrough();
const MetricReport = z
  .object({
    definition: MetricDefinition,
    revision: z.string().nullable(),
    days: z.array(MetricDay),
    total: z.string().nullable(),
    denominator: z.number().int().nullable(),
    actorCount: z.string().nullable(),
    countries: z.array(CountryMetric),
  })
  .passthrough();
const AppDailySummaryReport = z
  .object({ applicationUsers: MetricReport, registeredUsers: MetricReport })
  .passthrough();
const KPool_Common_ProblemDetails = z
  .object({
    type: z.string(),
    status: z.number().int(),
    title: z.string(),
    detail: z.string(),
    instance: z.string(),
    code: z.string(),
  })
  .partial()
  .passthrough();
const KPool_Common_Uuid = z.string();
const PolicyStatement = z
  .object({
    effect: z.enum(["allow", "deny"]),
    actions: z.array(z.literal("analysis:view")),
    resourceTypes: z.array(z.literal("analysis")),
  })
  .passthrough();
const PolicySummary = z
  .object({
    policyIdentifier: KPool_Common_Uuid.uuid(),
    name: z.string(),
    statements: z.array(PolicyStatement),
  })
  .passthrough();
const PrincipalSnapshot = z
  .object({
    principalIdentifier: KPool_Common_Uuid.uuid(),
    identityIdentifier: KPool_Common_Uuid.uuid(),
    status: z.enum(["active", "suspended", "forced_stop"]),
    policies: z.array(PolicySummary),
  })
  .passthrough();
const PrincipalSummary = z
  .object({
    principalIdentifier: KPool_Common_Uuid.uuid(),
    identityIdentifier: KPool_Common_Uuid.uuid(),
  })
  .passthrough();
const wikiIdentifier = KPool_Common_Uuid.nullish();
const WikiDailySummaryReport = z
  .object({
    views: MetricReport,
    viewers: MetricReport,
    engagementTime: MetricReport,
    submissions: MetricReport,
    publications: MetricReport,
  })
  .passthrough();
const KPool_Common_PrincipalStatusConflictProblem = KPool_Common_ProblemDetails;

export const schemas = {
  MetricDefinition,
  MetricDay,
  CountryMetric,
  MetricReport,
  AppDailySummaryReport,
  KPool_Common_ProblemDetails,
  KPool_Common_Uuid,
  PolicyStatement,
  PolicySummary,
  PrincipalSnapshot,
  PrincipalSummary,
  wikiIdentifier,
  WikiDailySummaryReport,
  KPool_Common_PrincipalStatusConflictProblem,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/app/daily-summary",
    alias: "AnalysisOperations_getAppDailySummaryReport",
    description: `Get all App metrics for an inclusive UTC period of at most one calendar year ending no later than UTC D-3. Stored historical periods have no age cutoff. Requires active Account/Account principal and enrolled active Analyze principal with analysis:view. General grants all analyses; explicit Deny wins. Authorization is re-evaluated on every request. country&#x3D;unknown selects unknown; omitted/null selects all. Country breakdowns are unavailable for imports predating country collection. Never returns individual viewer/actor identifiers. Invalid period: 400; invalid query format: 422.`,
    requestFormat: "json",
    parameters: [
      {
        name: "from",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "to",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "country",
        type: "Query",
        schema: z.string().nullish(),
      },
    ],
    response: AppDailySummaryReport,
    errors: [
      {
        status: 400,
        description: `The server could not understand the request due to invalid syntax.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/principal/me",
    alias: "PrincipalOperations_getCurrentPrincipal",
    description: `Inspect the authenticated identity&#x27;s Analyze principal in the current account, including suspended/forced-stop states. Returns 404 before Analyze enrollment. Returns the principal status and effective policies.`,
    requestFormat: "json",
    response: PrincipalSnapshot,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/principals",
    alias: "PrincipalOperations_createPrincipal",
    description: `Enable Analyze for the authenticated identity and current account. No caller-supplied identity or account is accepted. Requires active direct account membership, joins the account&#x27;s General group. General&#x27;s default role allows viewing every analysis, including other owners&#x27; Wikis and ALL, but suspended/forced-stop principals, missing grants and explicit Deny are rejected. Duplicate enrollment returns 409 without restoring permissions. Authorization cleanup never deletes analysis data.`,
    requestFormat: "json",
    response: PrincipalSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 409,
        description: `The request conflicts with the current state of the server.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/wiki/daily-summary",
    alias: "AnalysisOperations_getWikiDailySummaryReport",
    description: `Get all Wiki metrics under the App period/authorization rules, including other owners&#x27; Wikis. Omit both target identifiers for ALL; specify either Wiki or translation set, never both. language/country filter all Wiki metrics. country&#x3D;unknown selects unknown; omitted/null selects all. Stored zero values are measured zero; no summary rows means not_collected, including complete empty imports. Import failures leave published measurements unchanged and are handled through error monitoring and period-specific command retries. Operations read histories independently of imports. Counts, time and viewer-days sum; actor counts are period-distinct Principals. Country unknown is null. Countries without summary/history rows are omitted; absence alone does not prove measured zero. Authorization is re-evaluated on every request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "from",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "to",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "wikiIdentifier",
        type: "Query",
        schema: wikiIdentifier,
      },
      {
        name: "translationSetIdentifier",
        type: "Query",
        schema: wikiIdentifier,
      },
      {
        name: "language",
        type: "Query",
        schema: z.enum(["ja", "ko", "en"]).nullish(),
      },
      {
        name: "country",
        type: "Query",
        schema: z.string().nullish(),
      },
    ],
    response: WikiDailySummaryReport,
    errors: [
      {
        status: 400,
        description: `The server could not understand the request due to invalid syntax.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
]);

export const analyzeApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
