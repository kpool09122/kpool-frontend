import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { wikiStoryBasic } from "../storybook/fixtures";
import { WikiBasicPanel } from "./index";

describe("WikiBasicPanel", () => {
  it("renders the view mode panel", () => {
    render(
      <WikiBasicPanel
        basic={wikiStoryBasic}
        isEditing={false}
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText("Group profile")).toBeInTheDocument();
    expect(screen.getByText("Girl Group")).toBeInTheDocument();
  });

  it("submits edited basic fields", () => {
    const onSave = vi.fn();

    render(
      <WikiBasicPanel
        basic={wikiStoryBasic}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Agency"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Official Colors"), {
      target: { value: "Red\nBlue" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: wikiStoryBasic.name,
        agencyName: null,
        officialColors: ["Red", "Blue"],
      }),
    );
  });

  it("hides null basic fields in view mode but keeps them editable", () => {
    const basicWithNullCeo = {
      ...wikiStoryBasic,
      ceo: null,
    } as unknown as typeof wikiStoryBasic;
    const { rerender } = render(
      <WikiBasicPanel
        basic={basicWithNullCeo}
        isEditing={false}
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByText("CEO")).not.toBeInTheDocument();

    rerender(
      <WikiBasicPanel
        basic={basicWithNullCeo}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByLabelText("CEO")).toHaveValue("");
  });

  it("keeps edit mode fields aligned with displayed basic content", () => {
    const { container } = render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          groups: [
            {
              language: "ko",
              name: "TWICE",
              normalizedName: "twice",
              slug: "gr-twice",
              wikiIdentifier: "group-wiki-1",
            },
          ],
          realName: "Aurora Echo Real",
        }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByLabelText("CEO")).toHaveValue("");
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Real Name")).toHaveValue("Aurora Echo Real");
    expect(screen.getByRole("link", { name: "TWICE" })).toHaveAttribute(
      "href",
      "/wiki/ko/gr-twice",
    );

    const fieldGrid = container.querySelector("form > div");
    const labels = Array.from(fieldGrid?.children ?? []).map((element) => {
      const heading = element.querySelector("p")?.textContent;
      const labelText = Array.from(element.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE,
      )?.textContent;

      return (heading ?? labelText ?? "").trim();
    });

    expect(labels).toEqual([
      "Group Type",
      "Status",
      "Generation",
      "Debut Date",
      "Fandom Name",
      "Representative Symbol",
      "Groups",
      "Real Name",
      "Official Colors",
      "Agency",
    ]);
  });
});
