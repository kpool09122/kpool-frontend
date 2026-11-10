import { appReport, wikiReport } from "./analyzeReports";
export const regionalize = (report: typeof appReport | typeof wikiReport) =>
  Object.fromEntries(
    Object.entries(report).map(([key, metric]) => {
      const { countries: _countries, ...rest } = metric;
      void _countries;
      return [
        key,
        {
          ...rest,
          regions: [
            {
              region: "JP-13",
              mapSupported: true,
              value: "0",
              denominator: null,
              quality: [],
            },
            {
              region: "JP-99",
              mapSupported: false,
              value: "7",
              denominator: null,
              quality: [],
            },
            {
              region: null,
              mapSupported: false,
              value: "3",
              denominator: null,
              quality: [],
            },
          ],
        },
      ];
    }),
  );
