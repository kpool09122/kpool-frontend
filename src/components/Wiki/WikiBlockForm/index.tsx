"use client";

import { type FormEvent } from "react";
import {
  type WikiBlock,
  type WikiEmbedProvider,
  type WikiListType,
} from "@kpool/wiki";

import { getLines, getString } from "../editing";
import { WikiFormActions } from "../WikiFormActions";

type WikiBlockFormProps = {
  block: WikiBlock;
  onCancel: () => void;
  onSave: (changes: Partial<WikiBlock>) => void;
};

export function WikiBlockForm({
  block,
  onCancel,
  onSave,
}: WikiBlockFormProps) {
  const submit = (
    event: FormEvent<HTMLFormElement>,
    getChanges: (formData: FormData) => Partial<WikiBlock>,
  ) => {
    event.preventDefault();
    onSave(getChanges(new FormData(event.currentTarget)));
  };

  switch (block.blockType) {
    case "text":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ content: getString(data, "content") }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">Text<textarea className="min-h-28 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.content} name="content" /></label>
          <WikiFormActions onCancel={onCancel} />
        </form>
      );
    case "image":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ imageIdentifier: getString(data, "imageIdentifier"), imageSrc: getString(data, "imageSrc"), caption: getString(data, "caption") || null, alt: getString(data, "alt") || null }))}>
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Image identifier<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.imageIdentifier} name="imageIdentifier" /></label>
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Image URL<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.imageSrc} name="imageSrc" /></label>
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Alt<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.alt ?? ""} name="alt" /></label>
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Caption<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.caption ?? ""} name="caption" /></label>
          </div>
          <WikiFormActions onCancel={onCancel} />
        </form>
      );
    case "image_gallery":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ images: getLines(data, "images").map((line, index) => ({ imageIdentifier: line, imageSrc: block.images[index]?.imageSrc ?? block.images[0]?.imageSrc ?? "", alt: block.images[index]?.alt ?? line })), caption: getString(data, "caption") || null }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">Image identifiers<textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.images.map((image) => image.imageIdentifier).join("\n")} name="images" /></label>
          <label className="mt-3 grid gap-2 text-sm font-semibold text-text-strong">Caption<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.caption ?? ""} name="caption" /></label>
          <WikiFormActions onCancel={onCancel} />
        </form>
      );
    case "embed":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ provider: getString(data, "provider") as WikiEmbedProvider, embedId: getString(data, "embedId"), caption: getString(data, "caption") || null }))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Provider<select className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.provider} name="provider"><option value="youtube">youtube</option><option value="spotify">spotify</option><option value="x">x</option><option value="tiktok">tiktok</option></select></label>
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Embed ID<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.embedId} name="embedId" /></label>
            <label className="grid gap-2 text-sm font-semibold text-text-strong sm:col-span-2">Caption<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.caption ?? ""} name="caption" /></label>
          </div>
          <WikiFormActions onCancel={onCancel} />
        </form>
      );
    case "quote":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ content: getString(data, "content"), source: getString(data, "source") || null }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">Quote<textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.content} name="content" /></label>
          <label className="mt-3 grid gap-2 text-sm font-semibold text-text-strong">Source<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.source ?? ""} name="source" /></label>
          <WikiFormActions onCancel={onCancel} />
        </form>
      );
    case "list":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ listType: getString(data, "listType") as WikiListType, items: getLines(data, "items") }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">List type<select className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.listType} name="listType"><option value="bullet">bullet</option><option value="numbered">numbered</option></select></label>
          <label className="mt-3 grid gap-2 text-sm font-semibold text-text-strong">Items<textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.items.join("\n")} name="items" /></label>
          <WikiFormActions onCancel={onCancel} />
        </form>
      );
    case "table":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ headers: getLines(data, "headers"), rows: getLines(data, "rows").map((row) => row.split(",").map((cell) => cell.trim())) }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">Headers<textarea className="min-h-20 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={(block.headers ?? []).join("\n")} name="headers" /></label>
          <label className="mt-3 grid gap-2 text-sm font-semibold text-text-strong">Rows<textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.rows.map((row) => row.join(", ")).join("\n")} name="rows" /></label>
          <WikiFormActions onCancel={onCancel} />
        </form>
      );
    case "profile_card_list":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ title: getString(data, "title") || null, wikiIdentifiers: getLines(data, "wikiIdentifiers") }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">Title<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.title ?? ""} name="title" /></label>
          <label className="mt-3 grid gap-2 text-sm font-semibold text-text-strong">Wiki slugs<textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.wikiIdentifiers.join("\n")} name="wikiIdentifiers" /></label>
          <WikiFormActions onCancel={onCancel} />
        </form>
      );
  }
}
