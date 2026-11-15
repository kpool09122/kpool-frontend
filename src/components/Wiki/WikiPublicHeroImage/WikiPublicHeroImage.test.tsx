import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  render(<QueryClientProvider client={new QueryClient()}><I18nProvider initialLocale="en">{ui}</I18nProvider></QueryClientProvider>);

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
      author: null,
      license: null,
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

  it("renders the flip helper copy outside the card", () => {
    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        profileLabel="プロフィール"
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImage}
      />,
    );

    expect(screen.getByText("プロフィール", { exact: true })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "View basic details" })).toBeInTheDocument();
    expect(screen.queryByText("Flip to reveal the basic profile")).not.toBeInTheDocument();
  });

  it("shows the image source on the profile side", () => {
    renderWithI18n(
      <WikiPublicHeroImage basic={wikiStoryBasic} flipCardId="source-card" heroImage={{
        ...wikiStoryHeroImage,
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Hero.png",
        sourceName: "Wikimedia Commons",
      }} />,
    );
    expect(screen.getByText("Wikimedia Commons").closest("[inert]")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("wiki-flip-input"));
    expect(screen.getByText("Wikimedia Commons").closest("[inert]")).toBeNull();
    expect(screen.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute("href", "https://commons.wikimedia.org/wiki/File:Hero.png");
  });

  it("flips the card in both directions with the button", () => {
    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImage}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View basic details" }));

    expect(screen.getByTestId("wiki-flip-input")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Back to photo" }));
    expect(screen.getByTestId("wiki-flip-input")).not.toBeChecked();
  });

  it("shows the deletion request link only when image and translation set identifiers are available", () => {
    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImageWithIdentifier}
        translationSetIdentifier={translationSetIdentifier}
      />,
    );

    const requestButton = screen.getByText("Request image deletion");
    expect(requestButton.closest("[inert]")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("wiki-flip-input"));
    expect(requestButton.closest("[inert]")).toBeNull();

    cleanup();

    renderWithI18n(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImage}
      />,
    );

    expect(screen.queryByRole("button", { name: "Request image deletion" })).not.toBeInTheDocument();
  });

  it("renders the default hero image and does not allow another request when the hero image is hidden", () => {
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

    expect(screen.getByRole("img", { name: wikiStoryHeroImage.alt }).getAttribute("src"))
      .toContain("data:image/svg+xml");
    expect(screen.queryByRole("button", { name: "Request image deletion" })).not.toBeInTheDocument();
  });

  it("opens the deletion request dialog, requires a reason, and shows success after submit", async () => {
    const imageIdentifier = heroImageIdentifier;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(imageListResponse()))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            imageIdentifier,
            requesterName: "k-pool User",
            requesterEmail: "user@example.test",
            reason: "Rights concern",
            isHidden: true,
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

    fireEvent.click(screen.getByTestId("wiki-flip-input"));
    fireEvent.click(screen.getByRole("button", { name: "Request image deletion" }));

    expect(await screen.findByRole("dialog", { name: "Request image deletion" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit deletion request" })).not.toBeInTheDocument();
    await clickImageCard("Hero image");
    expect(screen.getByText("Selected: Hero image")).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: "Submit deletion request" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Requester name"), { target: { value: "k-pool User" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@example.test" } });
    fireEvent.change(screen.getByLabelText("Reason for requesting deletion"), {
      target: { value: "Rights concern" },
    });
    fireEvent.click(submitButton);

    expect(
      await screen.findByText(
        "The image has been temporarily hidden. We will notify you if permanent removal is approved.",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/wiki/images/${imageIdentifier}/request-deletion`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          requesterName: "k-pool User",
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

    fireEvent.click(screen.getByTestId("wiki-flip-input"));
    fireEvent.click(screen.getByRole("button", { name: "Request image deletion" }));
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
                "Image deletion request failed. If a request is already pending, duplicate requests cannot be submitted.",
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

    fireEvent.click(screen.getByTestId("wiki-flip-input"));
    fireEvent.click(screen.getByRole("button", { name: "Request image deletion" }));
    await clickImageCard("Hero image");
    expect(screen.getByText("Selected: Hero image")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Requester name"), { target: { value: "k-pool User" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@example.test" } });
    fireEvent.change(screen.getByLabelText("Reason for requesting deletion"), {
      target: { value: "Rights concern" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit deletion request" }));

    expect(await screen.findByText(/duplicate requests cannot be submitted/)).toBeInTheDocument();
  });
});
