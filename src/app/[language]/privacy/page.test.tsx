import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivacyPage, { generateMetadata } from "./page";

describe("PrivacyPage", () => {
  it("renders the Japanese collected-information and request sections", async () => {
    render(await PrivacyPage({ params: Promise.resolve({ language: "ja" }) }));

    expect(screen.getByRole("heading", { level: 1, name: "K-Pool プライバシーポリシー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "2. 取得する情報" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "10. 開示・訂正・利用停止・削除等" })).toBeInTheDocument();
  });

  it("provides localized metadata", async () => {
    await expect(generateMetadata({ params: Promise.resolve({ language: "ko" }) })).resolves.toMatchObject({
      title: "K-Pool 개인정보 처리방침",
    });
  });
});
