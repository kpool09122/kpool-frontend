"use client";

import { Fragment } from "react";
import Image from "next/image";
import { type WikiBlock, type WikiTableCell } from "@kpool/wiki";

import { WikiEmbedFrame } from "../WikiEmbedFrame";
import { WikiRelatedProfiles } from "../WikiRelatedProfiles";
import { buildWikiPath } from "@kpool/wiki";
import { parseInlineMarkdown } from "../editing";
import { ImageEditableOverlay } from "../icons";

type WikiBlockDisplayProps = {
  block: WikiBlock;
  language?: string;
  showEditableImageOverlay?: boolean;
  textClassName?: string;
};

const textWrapClassName = "min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]";
const inlineLinkClassName = `${textWrapClassName} text-sky-700 underline decoration-sky-500 underline-offset-2 transition hover:text-sky-800`;
const captionClassName = `${textWrapClassName} mt-2 text-base text-text-muted`;
const tableCellClassName = `${textWrapClassName} border-b border-stroke-subtle px-3 py-2`;

export function WikiBlockDisplay({
  block,
  language = "ja",
  showEditableImageOverlay = false,
  textClassName = "text-base leading-7 text-text-strong",
}: WikiBlockDisplayProps) {
  const renderPlainTextWithNamuLinks = (text: string, keyPrefix: string) => {
    const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null = pattern.exec(text);

    while (match) {
      const [raw, targetValue, displayValue] = match;
      const target = targetValue?.trim() ?? "";

      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }

      if (target.startsWith("분류:") || target.startsWith("파일:")) {
        nodes.push(raw);
      } else {
        nodes.push(
          <a
            className={inlineLinkClassName}
            href={buildWikiPath(language, target)}
            key={`${keyPrefix}-namu-link-${match.index}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {displayValue?.trim() || target}
          </a>,
        );
      }

      lastIndex = match.index + raw.length;
      match = pattern.exec(text);
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  const renderInlineTokens = (content: string | ReturnType<typeof parseInlineMarkdown>) => {
    const tokens = typeof content === "string" ? parseInlineMarkdown(content) : content;

    return tokens.map((token, index) => {
      switch (token.kind) {
        case "strong":
          return <strong key={`strong-${index}`}>{renderInlineTokens(token.children)}</strong>;
        case "emphasis":
          return <em key={`em-${index}`}>{renderInlineTokens(token.children)}</em>;
        case "strikethrough":
          return <del key={`del-${index}`}>{renderInlineTokens(token.children)}</del>;
        case "link":
          const href = token.href.startsWith("/wiki/")
            ? buildWikiPath(
                language,
                decodeURIComponent(token.href.slice("/wiki/".length)),
              )
            : token.href;

          return (
            <a
              className={inlineLinkClassName}
              href={href}
              key={`link-${index}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              {renderInlineTokens(token.children)}
            </a>
          );
        case "footnote":
          return (
            <sup
              aria-label={`Footnote: ${token.content}`}
              className="ml-1 text-sm font-semibold text-text-muted"
              key={`footnote-${index}`}
              title={token.content}
            >
              [*]
            </sup>
          );
        case "include":
          return (
            <span
              className={`${textWrapClassName} inline-flex max-w-full rounded-full border border-stroke-subtle px-2 py-0.5 text-sm font-semibold text-text-muted`}
              key={`include-${index}`}
            >
              Included from {token.target}
            </span>
          );
        case "text":
          return (
            <Fragment key={`text-${index}`}>
              {token.text.split("\n").map((line, lineIndex) => (
                <Fragment key={`text-${index}-line-${lineIndex}`}>
                  {lineIndex > 0 ? <br /> : null}
                  {renderPlainTextWithNamuLinks(line, `text-${index}-line-${lineIndex}`)}
                </Fragment>
              ))}
            </Fragment>
          );
      }
    });
  };

  const renderTextBlock = (content: string) => (
    <p className={`${textWrapClassName} ${textClassName}`}>
      {renderInlineTokens(content)}
    </p>
  );

  switch (block.blockType) {
    case "text":
      return renderTextBlock(block.content);
    case "image":
      if (block.isHidden) {
        return null;
      }

      return (
        <figure>
          <div className="relative min-h-64 overflow-hidden rounded-2xl border border-stroke-subtle">
            <Image alt={block.alt ?? ""} className="object-cover" fill sizes="100vw" src={block.imageSrc} unoptimized />
            {showEditableImageOverlay ? <ImageEditableOverlay /> : null}
          </div>
          {block.caption ? <figcaption className={captionClassName}>{block.caption}</figcaption> : null}
        </figure>
      );
    case "image_gallery": {
      const visibleImages = block.images.filter((image) => !image.isHidden);

      if (visibleImages.length === 0) {
        return null;
      }

      return (
        <figure>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleImages.map((image) => (
              <div className="relative min-h-40 overflow-hidden rounded-2xl border border-stroke-subtle" key={image.imageIdentifier}>
                <Image alt={image.alt ?? ""} className="object-cover" fill sizes="50vw" src={image.imageSrc} unoptimized />
                {showEditableImageOverlay ? <ImageEditableOverlay /> : null}
              </div>
            ))}
          </div>
          {block.caption ? <figcaption className={captionClassName}>{block.caption}</figcaption> : null}
        </figure>
      );
    }
    case "embed":
      return <WikiEmbedFrame block={block} />;
    case "quote":
      return (
        <blockquote className={`${textWrapClassName} border-l-4 border-text-muted/30 pl-4 text-lg leading-8 text-text-strong`}>
          {block.content}
          {block.source ? <cite className={`${textWrapClassName} mt-2 block text-base text-text-muted`}>{block.source}</cite> : null}
        </blockquote>
      );
    case "list":
      return block.listType === "numbered" ? (
        <ol className={`${textWrapClassName} list-decimal space-y-2 pl-6 text-base leading-7 text-text-strong`}>
          {block.items.map((item) => <li className={textWrapClassName} key={item}>{renderInlineTokens(item)}</li>)}
        </ol>
      ) : (
        <ul className={`${textWrapClassName} list-disc space-y-2 pl-6 text-base leading-7 text-text-strong`}>
          {block.items.map((item) => <li className={textWrapClassName} key={item}>{renderInlineTokens(item)}</li>)}
        </ul>
      );
    case "table":
      const headerCells: WikiTableCell[] | null =
        block.headerCells ?? block.headers?.map((header) => ({ content: header })) ?? null;
      const rowCells: WikiTableCell[][] =
        block.rowCells ?? block.rows.map((row) => row.map((cell) => ({ content: cell })));

      return (
        <div className="overflow-x-auto">
          <table
            className="min-w-full text-left text-base"
            style={block.tableWidth ? { width: `${block.tableWidth}px` } : undefined}
          >
            {headerCells ? (
              <thead>
                <tr>
                  {headerCells.map((header, index) => (
                    <th
                      className={tableCellClassName}
                      colSpan={header.colspan ?? 1}
                      key={`${header.content}-${index}`}
                    >
                      {header.content}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {rowCells.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      className={`${tableCellClassName} text-text-strong`}
                      colSpan={cell.colspan ?? 1}
                      key={`${cell.content}-${cellIndex}`}
                    >
                      {cell.content}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "profile_card_list":
      return <WikiRelatedProfiles block={block} language={language} />;
  }
}
