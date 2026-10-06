import { readFileSync } from "node:fs";
import documents from "./documents.json";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => {
  const readFile = vi.fn().mockRejectedValue(new Error("Runtime filesystem is unavailable in Workers"));
  return { readFile, default: { readFile } };
});

import { supportedLocales } from "../../../i18n/locales";
import { LegalDocument } from "./LegalDocument";

const expectedOperatorNames = {
  en: "Takehiro Ito",
  ja: "伊藤丈裕",
  ko: "Takehiro Ito",
};
const expectedTermsHeadings = {
  en: "4. User Content and License",
  ja: "4. 投稿コンテンツの権利と利用許諾",
  ko: "4. 게시 콘텐츠의 권리 및 이용 허락",
};
const expectedPrivacyHeadings = {
  en: "4. External Services",
  ja: "4. 外部サービス",
  ko: "4. 외부 서비스",
};

afterEach(() => {
  cleanup();
});

describe("LegalDocument", () => {
  it.each(supportedLocales)("bundles the exact repository-owned HTML for %s", (locale) => {
    for (const kind of ["terms", "privacy"] as const) {
      expect(documents[locale][kind]).toBe(readFileSync(`public/legal/${locale}/${kind}.html`, "utf8"));
    }
  });
  it.each(supportedLocales)("loads the terms fragment for %s", async (locale) => {
    render(await LegalDocument({ document: "terms", locale }));

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(expectedOperatorNames[locale])).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: expectedTermsHeadings[locale] }),
    ).toBeInTheDocument();
  });

  it.each(supportedLocales)("loads the privacy fragment for %s", async (locale) => {
    render(await LegalDocument({ document: "privacy", locale }));

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(expectedOperatorNames[locale])).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: expectedPrivacyHeadings[locale] }),
    ).toBeInTheDocument();
  });
});
