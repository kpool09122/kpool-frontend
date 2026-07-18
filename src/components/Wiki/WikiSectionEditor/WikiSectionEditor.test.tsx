import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n/I18nProvider";
import type { WikiContentEditorId } from "@kpool/wiki";

import { wikiStorySection } from "../storybook/fixtures";
import { WikiSectionEditor } from "./index";

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);

describe("WikiSectionEditor", () => {
  afterEach(() => cleanup());

  it("calls edit and delete handlers for the section header", () => {
    const onEdit = vi.fn();
    const onDeleteContent = vi.fn();

    renderWithI18n(
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

  it("disables section edit, delete, and add controls", () => {
    const onEdit = vi.fn();
    const onDeleteContent = vi.fn();

    renderWithI18n(
      <WikiSectionEditor
        disabled
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

    const editButton = screen.getByRole("button", { name: `Edit section ${wikiStorySection.title}` });
    const deleteButton = screen.getByRole("button", { name: `Delete section ${wikiStorySection.title}` });

    expect(editButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "+ Section" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "+ Block" })[0]).toBeDisabled();

    fireEvent.click(editButton);
    fireEvent.click(deleteButton);

    expect(onEdit).not.toHaveBeenCalled();
    expect(onDeleteContent).not.toHaveBeenCalled();
  });

  it("renders the section title form when editing", () => {
    renderWithI18n(
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

  it("opens section editing without coupling it to the accordion toggle", () => {
    function TestSectionEditor() {
      const [editingId, setEditingId] = React.useState<WikiContentEditorId | null>(null);

      return (
        <WikiSectionEditor
          editingId={editingId}
          language="ja"
          onAddBlock={() => {}}
          onAddSection={() => {}}
          onCancel={() => setEditingId(null)}
          onDeleteContent={() => {}}
          onEdit={setEditingId}
          onSaveBlock={() => {}}
          onSaveSection={() => {}}
          section={wikiStorySection}
        />
      );
    }

    renderWithI18n(<TestSectionEditor />);

    const section = screen
      .getByTestId(`wiki-edit-section-${wikiStorySection.sectionIdentifier}`);
    const toggle = screen.getByRole("button", {
      name: `Toggle section ${wikiStorySection.title}`,
    });

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(section).not.toHaveTextContent("Section title");

    fireEvent.click(screen.getByRole("button", { name: `Edit section ${wikiStorySection.title}` }));

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Section title")).toBeInTheDocument();
  });
});
