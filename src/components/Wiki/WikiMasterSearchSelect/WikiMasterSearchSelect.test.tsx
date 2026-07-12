import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WikiMasterSearchSelect } from "./index";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("WikiMasterSearchSelect", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("searches with Enter and selects a candidate", async () => {
    const onChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          wikis: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              name: "TWICE",
              slug: "gr-twice",
              resourceType: "group",
            },
          ],
        }),
      ),
    );

    render(
      <WikiMasterSearchSelect
        language="ja"
        label="関連グループ"
        mode="multiple"
        onChange={onChange}
        resourceType="group"
        selectedItems={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("関連グループ keyword"), {
      target: { value: "twice" },
    });
    fireEvent.keyDown(screen.getByLabelText("関連グループ keyword"), { key: "Enter" });

    fireEvent.click(await screen.findByRole("button", { name: /TWICE/ }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "TWICE",
        wikiIdentifier: "11111111-1111-4111-8111-111111111111",
      }),
    ]);
  });

  it("shows empty and error states", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ wikis: [] }))
      .mockResolvedValueOnce(jsonResponse({ message: "検索エラー" }, 503));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <WikiMasterSearchSelect
        language="ja"
        label="関連タレント"
        mode="multiple"
        onChange={() => {}}
        resourceType="talent"
        selectedItems={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("関連タレント keyword"), {
      target: { value: "none" },
    });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));
    expect(await screen.findByText("候補が見つかりません")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("関連タレント keyword"), {
      target: { value: "error" },
    });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("検索エラー"));
  });
});
