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

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New Name" },
    });
    fireEvent.change(screen.getByLabelText("Agency"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Official Colors"), {
      target: { value: "Red\nBlue" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Name",
        agencyName: null,
        officialColors: ["Red", "Blue"],
      }),
    );
  });
});
