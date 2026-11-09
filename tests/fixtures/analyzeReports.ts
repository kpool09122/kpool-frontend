export const metric = {
  definition: {
    source: "ga4",
    metric: "views",
    grain: "day-wiki-language-country",
    version: "v1",
  },
  revision: "r1",
  total: "9007199254740993.000000000",
  denominator: null,
  actorCount: "3",
  countries: [
    {
      country: "JP",
      value: "0.000000000",
      denominator: null,
      actorCount: "2",
      quality: [],
    },
    {
      country: "KR",
      value: "12.000000000",
      denominator: null,
      actorCount: "2",
      quality: ["partial", "metric_definition_missing"],
    },
    {
      country: null,
      value: "4.000000000",
      denominator: null,
      actorCount: "1",
      quality: [],
    },
  ],
  days: [
    {
      day: "2020-01-01",
      availability: "measured",
      value: "0.000000000",
      denominator: null,
      actorCount: "2",
      quality: [],
      updatedAt: "2026-11-01T01:00:00Z",
    },
    {
      day: "2020-01-02",
      availability: "not_collected",
      value: null,
      denominator: null,
      actorCount: null,
      quality: [],
      updatedAt: null,
    },
    {
      day: "2020-01-03",
      availability: "missing",
      value: null,
      denominator: 10,
      actorCount: null,
      quality: ["thresholding"],
      updatedAt: "2026-11-01T01:00:00Z",
    },
    {
      day: "2020-01-04",
      availability: "incomplete",
      value: "12.000000000",
      denominator: 10,
      actorCount: "2",
      quality: ["partial"],
      updatedAt: "2026-11-01T01:00:00Z",
    },
  ],
};
export const appReport = {
  applicationUsers: metric,
  registeredUsers: { ...metric, total: "42", actorCount: null },
};
export const wikiReport = {
  views: metric,
  viewers: metric,
  engagementTime: {
    ...metric,
    definition: { ...metric.definition, metric: "engagement_seconds" },
    total: "120",
    denominator: 8,
    countries: [
      { ...metric.countries[0], value: "0.000000000", denominator: 2 },
      { ...metric.countries[1], value: "80", denominator: 4 },
      { ...metric.countries[2], value: "40", denominator: 2 },
    ],
    days: [
      { ...metric.days[0], value: "0.000000000", denominator: 2 },
      metric.days[1],
      metric.days[2],
      { ...metric.days[3], value: "120", denominator: 6 },
    ],
  },
  submissions: {
    ...metric,
    days: metric.days.map((day) => ({ ...day, updatedAt: null })),
  },
  publications: metric,
};
