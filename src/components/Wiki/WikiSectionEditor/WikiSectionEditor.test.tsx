import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStorySection } from "../storybook/fixtures";
import { WikiSectionEditor } from "./index";

describe("WikiSectionEditor", () => {
  afterEach(() => cleanup());

  it("calls edit and delete handlers for the section header", () => {
    const onEdit = vi.fn();
    const onDeleteContent = vi.fn();

    render(
      <WikiSectionEditor
        editingId={null}
        language="ja"
        onAddBlock={() => {}}
        onAddSection={() => {}}
        onCancel={() => {}}
        onDeleteContent={onDeleteContent}
        onEdit={onEdit}
        onSaveBlock={() => {}}
        onSaveSection={() => {}}
        section={wikiStorySection}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: `Edit section ${wikiStorySection.title}` }));
    fireEvent.click(screen.getByRole("button", { name: `Delete section ${wikiStorySection.title}` }));

    expect(onEdit).toHaveBeenCalledWith(`section:${wikiStorySection.sectionIdentifier}`);
    expect(onDeleteContent).toHaveBeenCalledWith(wikiStorySection.sectionIdentifier);
  });

  it("renders the section title form when editing", () => {
    render(
      <WikiSectionEditor
        editingId={`section:${wikiStorySection.sectionIdentifier}`}
        language="ja"
        onAddBlock={() => {}}
        onAddSection={() => {}}
        onCancel={() => {}}
        onDeleteContent={() => {}}
        onEdit={() => {}}
        onSaveBlock={() => {}}
        onSaveSection={() => {}}
        section={wikiStorySection}
      />,
    );

    expect(screen.getByLabelText("Section title")).toBeInTheDocument();
  });
});
