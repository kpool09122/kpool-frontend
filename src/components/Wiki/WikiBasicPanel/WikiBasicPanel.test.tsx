import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStoryBasic } from "../storybook/fixtures";
import { WikiBasicPanel } from "./index";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("WikiBasicPanel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

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
    fireEvent.click(screen.getByRole("button", { name: "North Harbor Entertainment を削除" }));
    fireEvent.change(screen.getByLabelText("Official Colors"), {
      target: { value: "Red\nBlue" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: wikiStoryBasic.name,
        agency: null,
        agencyIdentifier: null,
        agencyName: null,
        officialColors: ["Red", "Blue"],
      }),
    );
  });

  it("uses date inputs for group, song, and talent date fields", () => {
    const { rerender } = render(
      <WikiBasicPanel
        basic={{ ...wikiStoryBasic, debutDate: "2021-05-06" }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByLabelText("Debut Date")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Debut Date")).toHaveValue("2021-05-06");

    rerender(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "song",
          releaseDate: "2024-01-15",
        }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByLabelText("Release Date")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Release Date")).toHaveValue("2024-01-15");

    rerender(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "talent",
          birthday: "2000-12-31",
        }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByLabelText("Birthday")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Birthday")).toHaveValue("2000-12-31");
  });

  it("submits changed date fields as YYYY-MM-DD strings", () => {
    const onSave = vi.fn();

    render(
      <WikiBasicPanel
        basic={{ ...wikiStoryBasic, debutDate: "2021-05-06" }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Debut Date"), {
      target: { value: "2026-02-03" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ debutDate: "2026-02-03" }),
    );

    cleanup();
    onSave.mockClear();
    render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "song",
          releaseDate: "2024-01-15",
        }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Release Date"), {
      target: { value: "2026-03-04" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ releaseDate: "2026-03-04" }),
    );

    cleanup();
    onSave.mockClear();
    render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "talent",
          birthday: "2000-12-31",
        }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Birthday"), {
      target: { value: "2001-01-02" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ birthday: "2001-01-02" }),
    );
  });

  it("treats cleared date fields as unset", () => {
    const onSave = vi.fn();

    render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "talent",
          birthday: "2000-12-31",
        }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Birthday"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ birthday: undefined }));
  });

  it("hides null basic fields in view mode but keeps them editable", () => {
    const basicWithNullCeo = {
      ...wikiStoryBasic,
      resourceType: "agency",
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

  it("keeps resource-specific empty fields editable", () => {
    const groupBasicWithEmptyFields = {
      ...wikiStoryBasic,
      agencyName: undefined,
      groupType: undefined,
      officialColors: undefined,
      status: undefined,
    } as unknown as typeof wikiStoryBasic;
    const { container, rerender } = render(
      <WikiBasicPanel
        basic={groupBasicWithEmptyFields}
        isEditing={false}
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );
    const panel = within(container);

    expect(panel.queryByText("Group Type")).not.toBeInTheDocument();
    expect(panel.queryByText("Official Colors")).not.toBeInTheDocument();

    rerender(
      <WikiBasicPanel
        basic={groupBasicWithEmptyFields}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(panel.getByLabelText("Group Type")).toHaveValue("");
    expect(panel.getByLabelText("Status")).toHaveValue("");
    expect(panel.getByLabelText("Official Colors")).toHaveValue("");
    expect(panel.getByLabelText("Agency")).toHaveValue("");
  });


  it("renders enum-backed basic fields as select controls with localized labels", () => {
    const { rerender } = render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          groupType: "girl_group",
          status: "hiatus",
          generation: "4th",
        }}
        isEditing
        language="en"
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByLabelText("Group Type").tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Girl group" })).toHaveValue("girl_group");
    expect(screen.getByRole("option", { name: "On hiatus" })).toHaveValue("hiatus");
    expect(screen.getByRole("option", { name: "4th generation" })).toHaveValue("4th");

    rerender(
      <WikiBasicPanel
        basic={{ ...wikiStoryBasic, resourceType: "agency", status: "rebranded" }}
        isEditing
        language="ko"
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByLabelText("Status").tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "리브랜딩됨" })).toHaveValue("rebranded");

    rerender(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "song",
          songType: "title_track",
          genres: ["pop", "dance"],
        }}
        isEditing
        language="ja"
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByLabelText("Song Type").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Genres").tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "タイトル曲" })).toHaveValue("title_track");
    expect(screen.getByRole("option", { name: "ダンス" })).toHaveValue("dance");

    rerender(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "talent",
          mbti: "ENFP",
          zodiacSign: "leo",
          englishLevel: "fluent",
          bloodType: "AB",
        }}
        isEditing
        language="en"
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByLabelText("MBTI").tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "ENFP" })).toHaveValue("ENFP");
    expect(screen.getByRole("option", { name: "Leo" })).toHaveValue("leo");
    expect(screen.getByRole("option", { name: "Fluent" })).toHaveValue("fluent");
    expect(screen.getByRole("option", { name: "Type AB" })).toHaveValue("AB");
  });

  it("submits enum raw values and clears unselected enum fields", () => {
    const onSave = vi.fn();

    render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "song",
          songType: undefined,
          genres: undefined,
        }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Song Type"), {
      target: { value: "pre_release" },
    });
    const genresSelect = screen.getByLabelText("Genres") as HTMLSelectElement;
    Array.from(genresSelect.options).forEach((option) => {
      option.selected = option.value === "pop" || option.value === "edm";
    });
    fireEvent.change(genresSelect);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        songType: "pre_release",
        genres: ["pop", "edm"],
      }),
    );

    cleanup();
    onSave.mockClear();
    render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "song",
          songType: "title_track",
          genres: ["pop", "edm"],
        }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    const existingGenresSelect = screen.getByLabelText("Genres") as HTMLSelectElement;
    Array.from(existingGenresSelect.options).forEach((option) => {
      option.selected = false;
    });
    fireEvent.change(existingGenresSelect);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ genres: undefined }));

    cleanup();
    onSave.mockClear();
    render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "talent",
          mbti: "INTJ",
          zodiacSign: "aries",
          englishLevel: "basic",
          bloodType: "A",
        }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("MBTI"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Zodiac Sign"), { target: { value: "pisces" } });
    fireEvent.change(screen.getByLabelText("English Level"), { target: { value: "native" } });
    fireEvent.change(screen.getByLabelText("Blood Type"), { target: { value: "O" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        mbti: undefined,
        zodiacSign: "pisces",
        englishLevel: "native",
        bloodType: "O",
      }),
    );
  });

  it("uses the selected agency search result for the local preview state", async () => {
    const onSave = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          wikis: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              name: "JYP Entertainment",
              slug: "ag-jyp",
              resourceType: "agency",
            },
          ],
        }),
      ),
    );

    render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          agency: null,
          agencyIdentifier: null,
          agencyName: null,
        }}
        isEditing
        language="ko"
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Agency keyword"), {
      target: { value: "JYP" },
    });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));
    fireEvent.click(await screen.findByRole("button", { name: /JYP Entertainment/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          agency: {
            wikiIdentifier: "11111111-1111-4111-8111-111111111111",
            slug: "ag-jyp",
            language: "ko",
            name: "JYP Entertainment",
          },
          agencyIdentifier: "11111111-1111-4111-8111-111111111111",
          agencyName: "JYP Entertainment",
        }),
      ),
    );
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

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Real Name")).toHaveValue("Aurora Echo Real");
    expect(screen.queryByRole("link", { name: "TWICE" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Groups keyword")).toHaveValue("TWICE");
    expect(within(screen.getByLabelText("Groups selected")).getByText("TWICE")).toBeInTheDocument();

    const fieldGrid = container.querySelector("form > div");
    const labels = Array.from(fieldGrid?.children ?? []).map((element) => {
      const heading = element.querySelector("p")?.textContent;
      const labelElement = element.matches("label") ? element : element.querySelector("label");
      const labelText = labelElement?.childNodes[0]?.textContent;

      return (heading ?? labelText ?? "").trim();
    });

    expect(labels).toEqual([
      "Group Type",
      "Status",
      "Generation",
      "Debut Date",
      "Fandom Name",
      "Representative Symbol",
      "Agency",
      "Groups",
      "Real Name",
      "Official Colors",
    ]);
  });

  it("places song talents immediately after groups in edit mode", () => {
    const { container } = render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "song",
          songType: "title",
          groups: [
            {
              language: "ko",
              name: "TWICE",
              normalizedName: "twice",
              slug: "gr-twice",
              wikiIdentifier: "group-wiki-1",
            },
          ],
          talents: [
            {
              language: "ko",
              name: "NAYEON",
              normalizedName: "nayeon",
              slug: "tl-nayeon",
              wikiIdentifier: "talent-wiki-1",
            },
          ],
        }}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    const fieldGrid = container.querySelector("form > div");
    const labels = Array.from(fieldGrid?.children ?? []).map((element) => {
      const labelElement = element.matches("label") ? element : element.querySelector("label");
      const labelText = labelElement?.childNodes[0]?.textContent;

      return (labelText ?? "").trim();
    });

    expect(labels.slice(labels.indexOf("Groups"), labels.indexOf("Groups") + 3)).toEqual([
      "Groups",
      "Talents",
      "Release Date",
    ]);
  });

  it("uses selected song talents for the local preview state", async () => {
    const onSave = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          wikis: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              name: "NAYEON",
              slug: "tl-nayeon",
              resourceType: "talent",
            },
          ],
        }),
      ),
    );

    render(
      <WikiBasicPanel
        basic={{
          ...wikiStoryBasic,
          resourceType: "song",
          groups: [],
          groupIdentifiers: [],
          talents: [],
          talentIdentifiers: [],
        }}
        isEditing
        language="ko"
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Talents keyword"), {
      target: { value: "NAYEON" },
    });
    fireEvent.keyDown(screen.getByLabelText("Talents keyword"), { key: "Enter" });
    fireEvent.click(await screen.findByRole("button", { name: /NAYEON/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          talents: [
            {
              wikiIdentifier: "22222222-2222-4222-8222-222222222222",
              slug: "tl-nayeon",
              language: "ko",
              name: "NAYEON",
            },
          ],
          talentIdentifiers: ["22222222-2222-4222-8222-222222222222"],
        }),
      ),
    );
  });
});
