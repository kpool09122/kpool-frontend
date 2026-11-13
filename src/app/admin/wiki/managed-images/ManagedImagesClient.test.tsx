import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { ManagedImageWorkspace, ImageMetadataForm } from "./ManagedImagesClient";
import { dictionaries } from "@/i18n/dictionaries";
import * as api from "@/gateways/wiki/managedImageBrowserApi";
import type { ManagedImage } from "@kpool/wiki";
vi.mock("@/gateways/wiki/managedImageBrowserApi", () => ({ fetchManagedImages: vi.fn(), updateImageMetadata: vi.fn() }));
const image: ManagedImage = {
  imageIdentifier: "11111111-1111-4111-8111-111111111111", url: "https://example.com/image.jpg", resourceType: "talent",
  translationSetIdentifier: "22222222-2222-4222-8222-222222222222", displayOrder: 0, sourceUrl: "https://example.com/source",
  sourceName: "Source", author: null, license: null, altText: "Photo", isHidden: false, uploadedAt: null,
  wiki: { names: { en: "Artist" }, slug: "artist" }, status: "approved",
};
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("edits only metadata and preserves explicitly chosen license for a legacy image", () => {
  const save = vi.fn();
  render(<ImageMetadataForm image={image} t={dictionaries.en.admin} busy={false} error={null} onSave={save} onCancel={vi.fn()} />);
  expect(screen.queryByLabelText(/URL/i)).toBeNull();
  expect(document.querySelector('input[type="file"]')).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: dictionaries.en.admin.imageAuthorLabel }), { target: { value: "Photographer" } });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "CC-BY-4.0" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(save).toHaveBeenCalledWith({ sourceName: "Source", author: "Photographer", license: "CC-BY-4.0", altText: "Photo", displayOrder: 0 });
});
it("loads approved management images, hides status and refreshes after saving", async () => {
  vi.mocked(api.fetchManagedImages).mockResolvedValue({ images: [{ ...image, author: "Author", license: "CC-BY-4.0" }], current_page: 1, last_page: 1, per_page: 12, total: 1 });
  vi.mocked(api.updateImageMetadata).mockResolvedValue({ imageIdentifier: image.imageIdentifier, resourceType: "talent", isHidden: false });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ManagedImageWorkspace scope="actor" locale="en" t={dictionaries.en.admin} /></QueryClientProvider>);
  await screen.findByRole("link", { name: "Artist" });
  expect(screen.queryByText("approved")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByRole("textbox", { name: dictionaries.en.admin.imageAuthorLabel }), { target: { value: "New author" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await screen.findByRole("status");
  await waitFor(() => expect(api.fetchManagedImages).toHaveBeenCalledTimes(2));
  expect(api.updateImageMetadata).toHaveBeenCalledWith(image.imageIdentifier, expect.objectContaining({ author: "New author" }), dictionaries.en.admin.managedImages.saveFailed);
  client.clear();
});

it("displays an image without a linked Wiki without rendering an empty link", async () => {
  vi.mocked(api.fetchManagedImages).mockResolvedValue({ images: [{ ...image, wiki: { names: {}, slug: "" } }], current_page: 1, last_page: 1, per_page: 12, total: 1 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ManagedImageWorkspace scope="orphan" locale="en" t={dictionaries.en.admin} /></QueryClientProvider>);
  await screen.findByRole("button", { name: "Edit" });
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Source" }).getAttribute("href")).toBe(image.sourceUrl);
  client.clear();
});
