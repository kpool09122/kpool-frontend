"use client";

import Image from "next/image";
import { type WikiBlock } from "@kpool/wiki";

import { WikiEmbedFrame } from "../../../app/wiki/[slug]/WikiEmbedFrame";
import { WikiRelatedProfiles } from "../../../app/wiki/[slug]/WikiRelatedProfiles";
import { ImageEditableOverlay } from "../icons";

type WikiBlockDisplayProps = {
  block: WikiBlock;
  showEditableImageOverlay?: boolean;
  textClassName?: string;
};

export function WikiBlockDisplay({
  block,
  showEditableImageOverlay = false,
  textClassName = "text-sm leading-7 text-text-muted",
}: WikiBlockDisplayProps) {
  switch (block.blockType) {
    case "text":
      return <p className={textClassName}>{block.content}</p>;
    case "image":
      return (
        <figure>
          <div className="relative min-h-64 overflow-hidden rounded-2xl border border-stroke-subtle">
            <Image alt={block.alt ?? ""} className="object-cover" fill sizes="100vw" src={block.imageSrc} />
            {showEditableImageOverlay ? <ImageEditableOverlay /> : null}
          </div>
          {block.caption ? <figcaption className="mt-2 text-sm text-text-muted">{block.caption}</figcaption> : null}
        </figure>
      );
    case "image_gallery":
      return (
        <figure>
          <div className="grid gap-3 sm:grid-cols-2">
            {block.images.map((image) => (
              <div className="relative min-h-40 overflow-hidden rounded-2xl border border-stroke-subtle" key={image.imageIdentifier}>
                <Image alt={image.alt ?? ""} className="object-cover" fill sizes="50vw" src={image.imageSrc} />
                {showEditableImageOverlay ? <ImageEditableOverlay /> : null}
              </div>
            ))}
          </div>
          {block.caption ? <figcaption className="mt-2 text-sm text-text-muted">{block.caption}</figcaption> : null}
        </figure>
      );
    case "embed":
      return <WikiEmbedFrame block={block} />;
    case "quote":
      return (
        <blockquote className="border-l-4 border-text-muted/30 pl-4 text-base leading-8 text-text-strong">
          {block.content}
          {block.source ? <cite className="mt-2 block text-sm text-text-muted">{block.source}</cite> : null}
        </blockquote>
      );
    case "list":
      return block.listType === "numbered" ? (
        <ol className="list-decimal space-y-2 pl-6 text-sm leading-7 text-text-muted">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ol>
      ) : (
        <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-text-muted">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            {block.headers ? (
              <thead>
                <tr>{block.headers.map((header) => <th className="border-b border-stroke-subtle px-3 py-2" key={header}>{header}</th>)}</tr>
              </thead>
            ) : null}
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")}>{row.map((cell) => <td className="border-b border-stroke-subtle px-3 py-2 text-text-muted" key={cell}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "profile_card_list":
      return <WikiRelatedProfiles block={block} />;
  }
}
