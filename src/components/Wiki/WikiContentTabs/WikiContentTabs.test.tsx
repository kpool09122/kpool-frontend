import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WikiContentTabs } from "./index";

describe("WikiContentTabs", () => {
  afterEach(() => cleanup());

  it("renders wiki content in an accessible tab panel", () => {
    render(
      <WikiContentTabs
        ariaLabel="Wiki content tabs"
        tabs={[
          {
            id: "wiki",
            label: "Wiki",
            panel: <p>Wiki body</p>,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("tablist", { name: "Wiki content tabs" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Wiki" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Wiki body");
  });

  it("switches panels from the array-based tab definition", () => {
    render(
      <WikiContentTabs
        ariaLabel="Wiki content tabs"
        tabs={[
          {
            id: "wiki",
            label: "Wiki",
            panel: <p>Wiki body</p>,
          },
          {
            id: "video",
            label: "Video",
            panel: <p>Video body</p>,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Video" }));

    expect(screen.getByRole("tab", { name: "Wiki" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Video" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Video body");
    expect(screen.queryByText("Wiki body")).not.toBeInTheDocument();
  });

  it("keeps disabled tabs unselectable and moves focus between enabled tabs", () => {
    render(
      <WikiContentTabs
        ariaLabel="tabs"
        tabs={[
          { id: "wiki", label: "Wiki", panel: <p>Body</p> },
          {
            id: "video",
            label: "Video",
            disabled: true,
            panel: <p>Video body</p>,
          },
          { id: "other", label: "Other", panel: <p>Other body</p> },
        ]}
      />,
    );
    const wiki = screen.getByRole("tab", { name: "Wiki" });
    const video = screen.getByRole("tab", { name: "Video" });
    expect(video).toBeDisabled();
    fireEvent.click(video);
    fireEvent.keyDown(video, { key: "ArrowRight" });
    expect(wiki).toHaveAttribute("aria-selected", "true");
    wiki.focus();
    fireEvent.keyDown(wiki, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Other" })).toHaveFocus();
    expect(screen.queryByText("Video body")).not.toBeInTheDocument();
  });

  it("supports arrow-key tab navigation", () => {
    render(
      <WikiContentTabs
        ariaLabel="Wiki content tabs"
        tabs={[
          {
            id: "wiki",
            label: "Wiki",
            panel: <p>Wiki body</p>,
          },
          {
            id: "video",
            label: "Video",
            panel: <p>Video body</p>,
          },
        ]}
      />,
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "Wiki" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tab", { name: "Video" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "Video" }), {
      key: "ArrowLeft",
    });
    expect(screen.getByRole("tab", { name: "Wiki" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
