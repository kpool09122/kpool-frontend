import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WikiImageBlock, WikiImageGalleryBlock, WikiUploadedImage } from "@kpool/wiki";
import { WikiBlockForm } from "./index";
import type { WikiImagePicker } from "../WikiImageLibrary/types";

const block: WikiImageBlock = {
  blockIdentifier: "block-photo", blockType: "image", displayOrder: 1,
  imageIdentifier: "old-image", imageSrc: "https://images.example.test/old.jpg", alt: "Old photo", caption: "Original caption",
};
const selected: WikiUploadedImage = {
  imageIdentifier: "new-image", url: "https://images.example.test/new.jpg", altText: "New photo",
  resourceType: "talent", wikiIdentifier: "wiki", translationSetIdentifier: "translation", displayOrder: 1,
  sourceUrl: "https://example.test/source", sourceName: "Source", author: null, license: null, isHidden: false, uploadedAt: "2026-11-11T00:00:00Z",
};
const pickImage: WikiImagePicker = (onSelect) => onSelect(selected);

describe("Wiki image block library editing", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("previews a selection and saves its identifier, URL, and alt together", () => {
    const onSave = vi.fn();
    render(<WikiBlockForm block={block} onRequestImage={pickImage} onCancel={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Wiki画像ライブラリを開く: Old photo" }));
    expect(screen.getByAltText("New photo")).toHaveAttribute("src", selected.url);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "キャプション" })).toHaveValue("Original caption");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith({ imageIdentifier: selected.imageIdentifier, imageSrc: selected.url, alt: selected.altText, caption: "Original caption", isHidden: false });
  });

  it("does not save a selection when the form is cancelled", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<WikiBlockForm block={block} onRequestImage={pickImage} onCancel={onCancel} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Wiki画像ライブラリを開く: Old photo" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows an image selection frame for a new block and inherits library metadata", () => {
    const onSave = vi.fn();
    render(<WikiBlockForm block={{ ...block, imageIdentifier: "pending-image", caption: "New image caption" }} onRequestImage={pickImage} onCancel={vi.fn()} onSave={onSave} />);
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "画像を選択" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith({ imageIdentifier: selected.imageIdentifier, imageSrc: selected.url, alt: selected.altText, caption: null, isHidden: false });
  });

  it("saves a block caption alongside the image's library metadata", () => {
    const onSave = vi.fn();
    render(<WikiBlockForm block={block} onRequestImage={pickImage} onCancel={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByRole("textbox", { name: "キャプション" }), { target: { value: "Live performance" } });
    fireEvent.click(screen.getByRole("button", { name: "Wiki画像ライブラリを開く: Old photo" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith({ imageIdentifier: selected.imageIdentifier, imageSrc: selected.url, alt: selected.altText, caption: "Live performance", isHidden: false });
  });

  it("saves the selected pixel width with the caption and selected library image", () => {
    const onSave = vi.fn();
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(640);
    render(<WikiBlockForm block={block} onRequestImage={pickImage} onCancel={vi.fn()} onSave={onSave} />);
    const image = screen.getByAltText("Old photo");
    Object.defineProperties(image, { naturalWidth: { value: 800 }, naturalHeight: { value: 600 } });
    fireEvent.load(image);
    fireEvent.change(screen.getByRole("slider", { name: /画像サイズ/ }), { target: { value: "450" } });
    fireEvent.click(screen.getByRole("button", { name: "Wiki画像ライブラリを開く: Old photo" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ imageWidth: 450, imageIdentifier: selected.imageIdentifier, caption: "Original caption" }));
  });

  it("retains the saved pixel width when the form is opened on a narrower screen", () => {
    const onSave = vi.fn();
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    render(<WikiBlockForm block={{ ...block, imageWidth: 450 }} onRequestImage={pickImage} onCancel={vi.fn()} onSave={onSave} />);
    const image = screen.getByAltText("Old photo");
    Object.defineProperties(image, { naturalWidth: { value: 800 }, naturalHeight: { value: 600 } });
    fireEvent.load(image);
    expect(screen.getByRole("slider", { name: /画像サイズ/ })).toHaveValue("300");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ imageWidth: 450 }));
  });

  it("adds a gallery selection and retains each image's own URL", () => {
    const gallery: WikiImageGalleryBlock = { blockIdentifier: "gallery", blockType: "image_gallery", displayOrder: 1, images: [block], caption: "Gallery caption" };
    const onSave = vi.fn();
    render(<WikiBlockForm block={gallery} onRequestImage={pickImage} onCancel={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "画像を追加" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith({ caption: "Gallery caption", images: [block, { imageIdentifier: selected.imageIdentifier, imageSrc: selected.url, alt: selected.altText, isHidden: false }] });
  });
});
