export const metric = {
  definition: {
    source: "ga4",
    metric: "views",
    grain: "day-wiki-language-country",
    version: "v1",
  },
  revision: "r1",
  total: "9007199254740993",
  denominator: null,
  actorCount: "3",
  countries: [
    {
      country: "JP",
      value: "0",
      denominator: null,
      actorCount: "2",
      quality: [],
    },
    {
      country: "KR",
      value: "12",
      denominator: null,
      actorCount: "2",
      quality: ["partial"],
    },
    {
      country: null,
      value: "4",
      denominator: null,
      actorCount: "1",
      quality: [],
    },
  ],
  days: [
    {
      day: "2020-01-01",
      availability: "measured",
      value: "0",
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
      value: "12",
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
  engagementTime: { ...metric, total: "12.3456" },
  submissions: {
    ...metric,
    days: metric.days.map((day) => ({ ...day, updatedAt: null })),
  },
  publications: metric,
};
