"use client";

import { Link2Icon } from "@radix-ui/react-icons";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { type FormEvent, type MouseEvent, useState } from "react";
import {
  type WikiBlock,
  type WikiEmbedProvider,
  type WikiListType,
  type WikiTextBlock,
} from "@kpool/wiki";

import {
  getLines,
  getString,
  inlineMarkdownToTiptapHtml,
  serializeTiptapJsonToInlineMarkdown,
} from "../editing";
import { cardSurfaceStyle } from "../styles";
import { WikiFormActions } from "../WikiFormActions";

type WikiBlockFormProps = {
  block: WikiBlock;
  onCancel: () => void;
  onSave: (changes: Partial<WikiBlock>) => void;
};

type TextBlockFormProps = {
  block: WikiTextBlock;
  onCancel: () => void;
  onSave: (changes: Partial<WikiBlock>) => void;
};

function WikiTextBlockForm({ block, onCancel, onSave }: TextBlockFormProps) {
  const editorLabelId = `wiki-text-label-${block.blockIdentifier}`;
  const [linkUrl, setLinkUrl] = useState("");
  const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false);
  const editor = useEditor({
    content: inlineMarkdownToTiptapHtml(block.content),
    editorProps: {
      attributes: {
        "aria-labelledby": editorLabelId,
        class:
          "min-h-32 whitespace-pre-wrap break-words px-3 py-3 outline-none before:text-text-muted empty:before:content-['Write_something…'] [&_a]:text-sky-700 [&_a]:underline [&_a]:decoration-sky-500 [&_a]:underline-offset-2",
        role: "textbox",
      },
      handleKeyDown(view, event) {
        if (event.key !== "Enter" || event.isComposing) {
          return false;
        }

        const hardBreak = view.state.schema.nodes.hardBreak;

        if (!hardBreak) {
          return false;
        }

        event.preventDefault();
        view.dispatch(view.state.tr.replaceSelectionWith(hardBreak.create()).scrollIntoView());
        return true;
      },
    },
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        listItem: false,
        orderedList: false,
      }),
      Link.configure({
        autolink: false,
        linkOnPaste: false,
        openOnClick: false,
      }),
    ],
    immediatelyRender: false,
  });
  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isBoldActive: currentEditor?.isActive("bold") ?? false,
      isItalicActive: currentEditor?.isActive("italic") ?? false,
      isStrikeActive: currentEditor?.isActive("strike") ?? false,
      isLinkActive: currentEditor?.isActive("link") ?? false,
    }),
  }) ?? {
    isBoldActive: false,
    isItalicActive: false,
    isStrikeActive: false,
    isLinkActive: false,
  };

  const getMarkdownContent = () =>
    editor ? serializeTiptapJsonToInlineMarkdown(editor.getJSON()) : block.content;

  const applyFormat = (format: "bold" | "italic" | "strike" | "link") => {
    if (!editor) {
      return;
    }

    if (format === "link") {
      const href = linkUrl.trim();

      if (!href) {
        return;
      }

      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
      setIsLinkEditorOpen(false);
      setLinkUrl("");
      return;
    }

    if (format === "bold") {
      editor.chain().focus().toggleBold().run();
      return;
    }

    if (format === "italic") {
      editor.chain().focus().toggleItalic().run();
      return;
    }

    editor.chain().focus().toggleStrike().run();
  };

  const openLinkEditor = () => setIsLinkEditorOpen(true);

  const closeLinkEditor = () => {
    setIsLinkEditorOpen(false);
    setLinkUrl("");
    editor?.commands.focus();
  };

  const preserveSelection = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();
  const getToolbarButtonClassName = (isActive: boolean, typographyClassName: string) =>
    [
      "rounded-md border px-2 py-1 text-sm transition",
      isActive
        ? "border-stroke-strong bg-surface-base text-text-strong shadow-sm"
        : "border-transparent text-text-strong hover:border-stroke-subtle hover:bg-surface-base",
      typographyClassName,
    ].join(" ");
  const getIconButtonClassName = (isActive: boolean) =>
    [
      "rounded-md border p-1.5 transition",
      isActive
        ? "border-stroke-strong bg-surface-base text-text-strong shadow-sm"
        : "border-transparent text-text-strong hover:border-stroke-subtle hover:bg-surface-base",
    ].join(" ");

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      onSave({ content: getMarkdownContent() });
    }}
    >
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-text-strong" id={editorLabelId}>
          Text
        </label>
        <div className="overflow-hidden rounded-2xl border border-stroke-subtle" style={cardSurfaceStyle}>
          <div className="flex flex-wrap items-center gap-2 border-b border-stroke-subtle px-3 py-2">
            <button
              aria-label="Bold"
              aria-pressed={editorState.isBoldActive}
              className={getToolbarButtonClassName(editorState.isBoldActive, "font-bold")}
              onClick={() => applyFormat("bold")}
              onMouseDown={preserveSelection}
              type="button"
            >
              B
            </button>
            <button
              aria-label="Italic"
              aria-pressed={editorState.isItalicActive}
              className={getToolbarButtonClassName(editorState.isItalicActive, "italic")}
              onClick={() => applyFormat("italic")}
              onMouseDown={preserveSelection}
              type="button"
            >
              I
            </button>
            <button
              aria-label="Strike"
              aria-pressed={editorState.isStrikeActive}
              className={getToolbarButtonClassName(editorState.isStrikeActive, "line-through")}
              onClick={() => applyFormat("strike")}
              onMouseDown={preserveSelection}
              type="button"
            >
              S
            </button>
            <span aria-hidden="true" className="h-5 w-px bg-stroke-subtle" />
            <button
              aria-expanded={isLinkEditorOpen}
              aria-label="Insert link"
              aria-pressed={editorState.isLinkActive}
              className={getIconButtonClassName(editorState.isLinkActive)}
              onClick={openLinkEditor}
              onMouseDown={preserveSelection}
              type="button"
            >
              <Link2Icon aria-hidden="true" className="size-4" />
            </button>
          </div>
          {isLinkEditorOpen ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-stroke-subtle bg-surface-base px-3 py-2">
              <label className="sr-only" htmlFor={`wiki-link-${block.blockIdentifier}`}>
                Link destination
              </label>
              <input
                className="min-w-0 flex-1 rounded-lg border border-stroke-subtle bg-surface-raised px-3 py-2 text-sm font-normal"
                id={`wiki-link-${block.blockIdentifier}`}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="Paste a link"
                type="url"
                value={linkUrl}
              />
              <button className="rounded-md border border-stroke-subtle px-3 py-2 text-sm font-semibold text-text-strong disabled:cursor-not-allowed disabled:opacity-50" disabled={!linkUrl.trim()} onClick={() => applyFormat("link")} onMouseDown={(event) => event.preventDefault()} type="button">Apply</button>
              <button className="rounded-md px-2 py-2 text-sm text-text-muted transition hover:bg-surface-base" onClick={closeLinkEditor} type="button">Cancel</button>
            </div>
          ) : null}
          <EditorContent editor={editor} />
        </div>
      </div>
      <WikiFormActions onCancel={onCancel} />
    </form>
  );
}

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
      return <WikiTextBlockForm block={block} onCancel={onCancel} onSave={onSave} />;
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
