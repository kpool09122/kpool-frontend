import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n/I18nProvider";

import { wikiStoryBasic, wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiPublicHeroImage } from "./index";

const translationSetIdentifier = "55555555-5555-5555-5555-555555555555";
const heroImageIdentifier = "44444444-4444-4444-4444-444444444444";
const wikiStoryHeroImageWithIdentifier = {
  ...wikiStoryHeroImage,
  imageIdentifier: heroImageIdentifier,
};

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);

const imageListResponse = () => ({
  images: [
    {
      imageIdentifier: heroImageIdentifier,
      url: wikiStoryHeroImage.src,
      resourceType: "group",
      translationSetIdentifier,
      displayOrder: 1,
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Hero.png",
      sourceName: "Wikimedia Commons",
      altText: "Hero image",
      isHidden: false,
      uploadedAt: null,
    },
  ],
  current_page: 1,
  last_page: 1,
  total: 1,
  per_page: 12,
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const clickImageCard = async (altText: string) => {
  const imageLabel = await screen.findByText(`Alt text: ${altText}`);
  const imageButton = imageLabel.closest("button");

  if (!imageButton) {
    throw new Error(`Image card button was not found: ${altText}`);
  }

  fireEvent.click(imageButton);
};

describe("WikiPublicHeroImage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the mobile flip helper copy outside the card", () => {
    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImage}
      />,
    );

    expect(screen.getByText("Tap anywhere on the card to flip to the basic details.")).toBeInTheDocument();
    expect(screen.queryByText("Flip to reveal the basic profile")).not.toBeInTheDocument();
  });

  it("toggles the mobile helper copy when flipped", () => {
    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImage}
      />,
    );

    fireEvent.click(screen.getAllByTestId("wiki-flip-input")[0]);

    expect(screen.getByText("Tap the card again to return to the cover image.")).toBeInTheDocument();
  });

  it("shows the hide request link only when image and translation set identifiers are available", () => {
    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImageWithIdentifier}
        translationSetIdentifier={translationSetIdentifier}
      />,
    );

    expect(screen.getAllByRole("button", { name: "Request image hide" })).toHaveLength(2);

    cleanup();

    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImage}
      />,
    );

    expect(screen.queryByRole("button", { name: "Request image hide" })).not.toBeInTheDocument();
  });

  it("does not render or request a hidden hero image", () => {
    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={{
          ...wikiStoryHeroImageWithIdentifier,
          isHidden: true,
        }}
        translationSetIdentifier={translationSetIdentifier}
      />,
    );

    expect(screen.queryByRole("img", { name: wikiStoryHeroImage.alt })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request image hide" })).not.toBeInTheDocument();
  });

  it("opens the hide request dialog, requires a reason, and shows success after submit", async () => {
    const imageIdentifier = heroImageIdentifier;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(imageListResponse()))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            imageIdentifier,
            requesterName: "KPool User",
            requesterEmail: "user@example.test",
            reason: "Rights concern",
            status: "pending",
          },
          201,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImageWithIdentifier}
        translationSetIdentifier={translationSetIdentifier}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Request image hide" })[0]);

    expect(await screen.findByRole("dialog", { name: "Request image hide" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit hide request" })).not.toBeInTheDocument();
    await clickImageCard("Hero image");
    expect(screen.getByText("Selected: Hero image")).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: "Submit hide request" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Requester name"), { target: { value: "KPool User" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@example.test" } });
    fireEvent.change(screen.getByLabelText("Reason for hiding the image"), {
      target: { value: "Rights concern" },
    });
    fireEvent.click(submitButton);

    expect(
      await screen.findByText(
        "The image has been temporarily hidden. We will notify you if permanent removal is approved.",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/wiki/images/${imageIdentifier}/request-hide`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          requesterName: "KPool User",
          requesterEmail: "user@example.test",
          reason: "Rights concern",
        }),
      }),
    );
  });


  it("loads additional requestable images from the dialog", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          ...imageListResponse(),
          current_page: 1,
          last_page: 2,
          total: 2,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              ...imageListResponse().images[0],
              imageIdentifier: "66666666-6666-6666-6666-666666666666",
              altText: "Second image",
              displayOrder: 2,
            },
          ],
          current_page: 2,
          last_page: 2,
          total: 2,
          per_page: 12,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImageWithIdentifier}
        translationSetIdentifier={translationSetIdentifier}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Request image hide" })[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Load more images" }));

    expect(await screen.findByText("Alt text: Second image")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/wiki/images?translationSetIdentifier=55555555-5555-5555-5555-555555555555&perPage=12&page=2",
    );
  });

  it("shows a duplicate request friendly error when submit fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(imageListResponse()))
        .mockResolvedValueOnce(
          jsonResponse(
            {
              message:
                "Image hide request failed. If a request is already pending, duplicate requests cannot be submitted.",
            },
            409,
          ),
        ),
    );

    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImageWithIdentifier}
        translationSetIdentifier={translationSetIdentifier}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Request image hide" })[0]);
    await clickImageCard("Hero image");
    expect(screen.getByText("Selected: Hero image")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Requester name"), { target: { value: "KPool User" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@example.test" } });
    fireEvent.change(screen.getByLabelText("Reason for hiding the image"), {
      target: { value: "Rights concern" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit hide request" }));

    expect(await screen.findByText(/duplicate requests cannot be submitted/)).toBeInTheDocument();
  });
});
