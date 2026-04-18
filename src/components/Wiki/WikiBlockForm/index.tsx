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
  type WikiTableBlock,
  type WikiTableCell,
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

type TableBlockFormProps = {
  block: WikiTableBlock;
  onCancel: () => void;
  onSave: (changes: Partial<WikiBlock>) => void;
};

type TableEditorState = {
  hasHeaderRow: boolean;
  headerCells: WikiTableCell[];
  rowCells: WikiTableCell[][];
  tableWidth: string;
};

type TableCellSelection =
  | {
      kind: "header";
      cellIndexes: number[];
    }
  | {
      kind: "body";
      rowIndex: number;
      cellIndexes: number[];
    };

const getRenderedColumnCount = (cells: WikiTableCell[]): number =>
  cells.reduce((count, cell) => count + Math.max(1, cell.colspan ?? 1), 0);

const createEmptyTableCell = (): WikiTableCell => ({ content: "" });

const createEmptyTableRow = (columnCount: number): WikiTableCell[] =>
  Array.from({ length: Math.max(1, columnCount) }, () => createEmptyTableCell());

const getTableColumnCount = (headerCells: WikiTableCell[], rowCells: WikiTableCell[][]): number =>
  Math.max(
    1,
    getRenderedColumnCount(headerCells),
    ...rowCells.map((row) => getRenderedColumnCount(row)),
  );

const clampCellColspan = (
  row: WikiTableCell[],
  cellIndex: number,
  requestedColspan: number,
  columnCount: number,
): number => {
  const renderedBefore = row
    .slice(0, cellIndex)
    .reduce((count, cell) => count + Math.max(1, cell.colspan ?? 1), 0);
  const trailingCellCount = row.length - cellIndex - 1;
  const maxColspan = Math.max(1, columnCount - renderedBefore - trailingCellCount);

  return Math.max(1, Math.min(requestedColspan, maxColspan));
};

const normalizeTableRow = (row: WikiTableCell[], columnCount: number): WikiTableCell[] => {
  const safeRow = row.length > 0 ? row : [createEmptyTableCell()];
  const normalized = safeRow.map((cell, cellIndex) => ({
    content: cell.content,
    ...(clampCellColspan(
      safeRow,
      cellIndex,
      Math.max(1, cell.colspan ?? 1),
      columnCount,
    ) > 1
      ? {
          colspan: clampCellColspan(
            safeRow,
            cellIndex,
            Math.max(1, cell.colspan ?? 1),
            columnCount,
          ),
        }
      : {}),
  }));
  const renderedColumns = getRenderedColumnCount(normalized);

  if (renderedColumns >= columnCount) {
    return normalized;
  }

  return [
    ...normalized,
    ...Array.from({ length: columnCount - renderedColumns }, () => createEmptyTableCell()),
  ];
};

const normalizeTableEditorState = (state: TableEditorState): TableEditorState => {
  const baseColumnCount = getTableColumnCount(
    state.hasHeaderRow ? state.headerCells : [],
    state.rowCells,
  );
  const rowCells =
    state.rowCells.length > 0
      ? state.rowCells.map((row) => normalizeTableRow(row, baseColumnCount))
      : [createEmptyTableRow(baseColumnCount)];
  const columnCount = getTableColumnCount(state.hasHeaderRow ? state.headerCells : [], rowCells);

  return {
    ...state,
    headerCells: state.hasHeaderRow
      ? normalizeTableRow(state.headerCells, columnCount)
      : [],
    rowCells: rowCells.map((row) => normalizeTableRow(row, columnCount)),
  };
};

const createTableEditorState = (block: WikiTableBlock): TableEditorState =>
  normalizeTableEditorState({
    hasHeaderRow: Boolean((block.headerCells ?? block.headers)?.length),
    headerCells:
      block.headerCells ??
      block.headers?.map((header) => ({
        content: header,
      })) ??
      [],
    rowCells:
      block.rowCells ??
      block.rows.map((row) =>
        row.map((cell) => ({
          content: cell,
        })),
      ),
    tableWidth: block.tableWidth?.toString() ?? "",
  });

const toLegacyTableArrays = (cells: WikiTableCell[][]): string[][] =>
  cells.map((row) => row.map((cell) => cell.content.trim()));

const getSortedUniqueIndexes = (cellIndexes: number[]): number[] =>
  [...new Set(cellIndexes)].sort((left, right) => left - right);

const createSelectionRange = (startIndex: number, endIndex: number): number[] =>
  Array.from(
    { length: Math.abs(endIndex - startIndex) + 1 },
    (_, offset) => Math.min(startIndex, endIndex) + offset,
  );

const connectCells = (row: WikiTableCell[], selectedIndexes: number[]): WikiTableCell[] => {
  const indexes = getSortedUniqueIndexes(selectedIndexes);

  if (indexes.length < 2) {
    return row;
  }

  const [firstIndex] = indexes;

  if (firstIndex == null) {
    return row;
  }

  const firstCell = row[firstIndex];

  if (!firstCell) {
    return row;
  }

  const mergedColspan = indexes.length;

  return row.flatMap((cell, cellIndex) => {
    if (!indexes.includes(cellIndex)) {
      return [cell];
    }

    if (cellIndex !== firstIndex) {
      return [];
    }

    return [
      {
        ...firstCell,
        ...(mergedColspan > 1 ? { colspan: mergedColspan } : {}),
      },
    ];
  });
};

const cancelConnectedCell = (row: WikiTableCell[], cellIndex: number): WikiTableCell[] => {
  const cell = row[cellIndex];
  const colspan = cell?.colspan ?? 1;

  if (!cell || colspan <= 1) {
    return row;
  }

  return row.flatMap((currentCell, currentIndex) => {
    if (currentIndex !== cellIndex) {
      return [currentCell];
    }

    return [
      {
        content: currentCell.content,
      },
      ...Array.from({ length: colspan - 1 }, () => createEmptyTableCell()),
    ];
  });
};

function WikiTableBlockForm({ block, onCancel, onSave }: TableBlockFormProps) {
  const [tableState, setTableState] = useState<TableEditorState>(() => createTableEditorState(block));
  const [selection, setSelection] = useState<TableCellSelection | null>(null);
  const columnCount = getTableColumnCount(
    tableState.hasHeaderRow ? tableState.headerCells : [],
    tableState.rowCells,
  );

  const updateState = (updater: (current: TableEditorState) => TableEditorState) => {
    setTableState((current) => normalizeTableEditorState(updater(current)));
  };

  const isSelectedCell = (nextSelection: TableCellSelection | null): boolean => {
    if (!selection || !nextSelection || selection.kind !== nextSelection.kind) {
      return false;
    }

    if (selection.kind === "body" && nextSelection.kind === "body" && selection.rowIndex !== nextSelection.rowIndex) {
      return false;
    }

    return nextSelection.cellIndexes.some((cellIndex) => selection.cellIndexes.includes(cellIndex));
  };

  const selectCell = (
    nextSelection:
      | {
          kind: "header";
          cellIndex: number;
        }
      | {
          kind: "body";
          rowIndex: number;
          cellIndex: number;
        },
    useRangeSelection: boolean,
  ) => {
    setSelection((current) => {
      if (!useRangeSelection || !current || current.kind !== nextSelection.kind) {
        return nextSelection.kind === "header"
          ? { kind: "header", cellIndexes: [nextSelection.cellIndex] }
          : { kind: "body", rowIndex: nextSelection.rowIndex, cellIndexes: [nextSelection.cellIndex] };
      }

      if (current.kind === "body" && nextSelection.kind === "body" && current.rowIndex !== nextSelection.rowIndex) {
        return { kind: "body", rowIndex: nextSelection.rowIndex, cellIndexes: [nextSelection.cellIndex] };
      }

      const anchorIndex = current.cellIndexes[0] ?? nextSelection.cellIndex;
      const cellIndexes = createSelectionRange(anchorIndex, nextSelection.cellIndex);

      return nextSelection.kind === "header"
        ? { kind: "header", cellIndexes }
        : { kind: "body", rowIndex: nextSelection.rowIndex, cellIndexes };
    });
  };

  const updateHeaderCell = (cellIndex: number, content: string) => {
    updateState((current) => ({
      ...current,
      headerCells: current.headerCells.map((cell, index) =>
        index === cellIndex ? { ...cell, content } : cell,
      ),
    }));
  };

  const updateBodyCell = (rowIndex: number, cellIndex: number, content: string) => {
    updateState((current) => ({
      ...current,
      rowCells: current.rowCells.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentCellIndex) =>
              currentCellIndex === cellIndex ? { ...cell, content } : cell,
            )
          : row,
      ),
    }));
  };

  const addColumn = () => {
    updateState((current) => ({
      ...current,
      headerCells: current.hasHeaderRow
        ? [...current.headerCells, createEmptyTableCell()]
        : current.headerCells,
      rowCells: current.rowCells.map((row) => [...row, createEmptyTableCell()]),
    }));
    setSelection(null);
  };

  const addRow = () => {
    updateState((current) => ({
      ...current,
      rowCells: [...current.rowCells, createEmptyTableRow(columnCount)],
    }));
    setSelection(null);
  };

  const toggleHeaderRow = () => {
    updateState((current) => ({
      ...current,
      hasHeaderRow: !current.hasHeaderRow,
      headerCells: current.hasHeaderRow
        ? []
        : createEmptyTableRow(getTableColumnCount([], current.rowCells)),
    }));
    setSelection(null);
  };

  const selectedRow =
    selection == null
      ? null
      : selection.kind === "header"
        ? tableState.headerCells
        : tableState.rowCells[selection.rowIndex] ?? null;
  const selectedIndexes = selection ? getSortedUniqueIndexes(selection.cellIndexes) : [];
  const hasConnectAction =
    selectedRow != null &&
    selectedIndexes.length > 1 &&
    selectedIndexes.every((cellIndex, index) => {
      const cell = selectedRow[cellIndex];
      const previousIndex = selectedIndexes[index - 1];

      return (
        cell != null &&
        (cell.colspan ?? 1) === 1 &&
        (previousIndex == null || cellIndex === previousIndex + 1)
      );
    });
  const hasCancelConnectAction =
    selectedRow != null &&
    selectedIndexes.length === 1 &&
    ((selectedRow[selectedIndexes[0] ?? -1]?.colspan ?? 1) > 1);

  const connectSelection = () => {
    if (!selection || !hasConnectAction) {
      return;
    }

    if (selection.kind === "header") {
      updateState((current) => ({
        ...current,
        headerCells: connectCells(current.headerCells, selection.cellIndexes),
      }));
      setSelection({
        kind: "header",
        cellIndexes: [Math.min(...selection.cellIndexes)],
      });
      return;
    }

    updateState((current) => ({
      ...current,
      rowCells: current.rowCells.map((row, rowIndex) =>
        rowIndex === selection.rowIndex ? connectCells(row, selection.cellIndexes) : row,
      ),
    }));
    setSelection({
      kind: "body",
      rowIndex: selection.rowIndex,
      cellIndexes: [Math.min(...selection.cellIndexes)],
    });
  };

  const cancelConnectedSelection = () => {
    if (!selection || !hasCancelConnectAction) {
      return;
    }

    const selectedIndex = selection.cellIndexes[0];

    if (selectedIndex == null) {
      return;
    }

    if (selection.kind === "header") {
      updateState((current) => ({
        ...current,
        headerCells: cancelConnectedCell(current.headerCells, selectedIndex),
      }));
      setSelection({
        kind: "header",
        cellIndexes: createSelectionRange(
          selectedIndex,
          selectedIndex + ((tableState.headerCells[selectedIndex]?.colspan ?? 1) - 1),
        ),
      });
      return;
    }

    const selectedRowCell = tableState.rowCells[selection.rowIndex]?.[selectedIndex];
    const colspan = selectedRowCell?.colspan ?? 1;

    updateState((current) => ({
      ...current,
      rowCells: current.rowCells.map((row, rowIndex) =>
        rowIndex === selection.rowIndex ? cancelConnectedCell(row, selectedIndex) : row,
      ),
    }));
    setSelection({
      kind: "body",
      rowIndex: selection.rowIndex,
      cellIndexes: createSelectionRange(selectedIndex, selectedIndex + (colspan - 1)),
    });
  };

  const submitTable = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedState = normalizeTableEditorState(tableState);
    const headerCells = normalizedState.hasHeaderRow ? normalizedState.headerCells : null;
    const rowCells = normalizedState.rowCells;

    onSave({
      headerCells,
      headers: headerCells ? headerCells.map((cell) => cell.content.trim()) : null,
      rowCells,
      rows: toLegacyTableArrays(rowCells),
      tableWidth: normalizedState.tableWidth ? Number(normalizedState.tableWidth) : null,
    });
  };

  return (
    <form className="grid gap-4" onSubmit={submitTable}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-2 text-sm font-semibold text-text-strong">
          Table width
          <input
            className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2"
            min="1"
            onChange={(event) =>
              setTableState((current) => ({
                ...current,
                tableWidth: event.target.value,
              }))
            }
            type="number"
            value={tableState.tableWidth}
          />
        </label>
        <button
          className="rounded-xl border border-stroke-subtle px-3 py-2 text-sm font-semibold text-text-strong"
          onClick={toggleHeaderRow}
          type="button"
        >
          {tableState.hasHeaderRow ? "Remove header row" : "Add header row"}
        </button>
        <button
          className="rounded-xl border border-stroke-subtle px-3 py-2 text-sm font-semibold text-text-strong"
          onClick={addRow}
          type="button"
        >
          + Row
        </button>
        <button
          className="rounded-xl border border-stroke-subtle px-3 py-2 text-sm font-semibold text-text-strong"
          onClick={addColumn}
          type="button"
        >
          + Column
        </button>
        {hasConnectAction ? (
          <button
            className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2 text-sm font-semibold text-text-strong"
            onClick={connectSelection}
            type="button"
          >
            + Connect
          </button>
        ) : null}
        {hasCancelConnectAction ? (
          <button
            className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2 text-sm font-semibold text-text-strong"
            onClick={cancelConnectedSelection}
            type="button"
          >
            + Cancel connect
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stroke-subtle" style={cardSurfaceStyle}>
        <table
          className="min-w-full border-collapse text-left text-sm"
          style={tableState.tableWidth ? { width: `${tableState.tableWidth}px` } : undefined}
        >
          {tableState.hasHeaderRow ? (
            <thead>
              <tr>
                {tableState.headerCells.map((cell, cellIndex) => (
                  <th
                    className={`min-w-40 border-b border-stroke-subtle bg-surface-muted/60 align-top ${
                      isSelectedCell({ kind: "header", cellIndexes: [cellIndex] })
                        ? "ring-2 ring-text-strong/20 ring-inset"
                        : ""
                    }`}
                    colSpan={cell.colspan ?? 1}
                    key={`header-${cellIndex}`}
                  >
                    <div className="grid gap-2 p-3">
                      <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Header {cellIndex + 1}
                        <input
                          aria-label={`Header cell ${cellIndex + 1}`}
                          className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-sm font-normal text-text-strong"
                          onClick={(event) =>
                            selectCell({ kind: "header", cellIndex }, event.shiftKey)
                          }
                          onChange={(event) => updateHeaderCell(cellIndex, event.target.value)}
                          value={cell.content}
                        />
                      </label>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {tableState.rowCells.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    className={`min-w-40 border-b border-stroke-subtle align-top ${
                      isSelectedCell({ kind: "body", rowIndex, cellIndexes: [cellIndex] })
                        ? "bg-surface-muted/40 ring-2 ring-text-strong/15 ring-inset"
                        : ""
                    }`}
                    colSpan={cell.colspan ?? 1}
                    key={`row-${rowIndex}-cell-${cellIndex}`}
                  >
                    <div className="p-3">
                      <input
                        aria-label={`Row ${rowIndex + 1} cell ${cellIndex + 1}`}
                        className="w-full rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-normal text-text-strong outline-none transition focus:border-stroke-subtle focus:bg-surface-base"
                        onClick={(event) =>
                          selectCell({ kind: "body", rowIndex, cellIndex }, event.shiftKey)
                        }
                        onChange={(event) =>
                          updateBodyCell(rowIndex, cellIndex, event.target.value)
                        }
                        placeholder="Value"
                        value={cell.content}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <WikiFormActions onCancel={onCancel} />
    </form>
  );
}

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
      return <WikiTableBlockForm block={block} onCancel={onCancel} onSave={onSave} />;
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
