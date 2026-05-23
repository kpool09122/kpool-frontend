import { UploadIcon } from "@radix-ui/react-icons";

import { wikiImageAcceptAttribute } from "@kpool/wiki";
import {
  type WikiImageLibraryDictionary,
  type WikiImageRequestFormController,
} from "./types";

export function WikiImageRequestForm({
  controller,
  isBusy,
  isUploading,
  resourceType,
  t,
}: {
  controller: WikiImageRequestFormController;
  isBusy: boolean;
  isUploading: boolean;
  resourceType: string;
  t: WikiImageLibraryDictionary;
}) {
  const {
    canSubmitRequest,
    errorMessage,
    inputRef,
    isDragActive,
    requestForm,
    selectedFile,
    successMessage,
    selectFirstFile,
    setIsDragActive,
    setRequestForm,
    setSelectedFile,
    setSuccessMessage,
    submitRequest,
  } = controller;

  return (
    <div
      aria-labelledby="wiki-image-library-request-tab"
      className="grid gap-5"
      id="wiki-image-library-request-panel"
      role="tabpanel"
    >
      <div className="text-sm text-text-strong">
        <p>{t.requestDescriptionApproved}</p>
        <p className="mt-1">{t.requestDescriptionSharedLanguages}</p>
      </div>
      <div>
        <button
          className={`grid w-full place-items-center rounded-2xl border border-dashed p-8 text-center transition ${
            isDragActive
              ? "border-brand-primary bg-brand-highlight/30"
              : "border-stroke-subtle bg-surface-base hover:bg-brand-highlight/20"
          } disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragActive(false);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);
            selectFirstFile(event.dataTransfer.files);
          }}
          type="button"
        >
          <UploadIcon className="h-6 w-6 text-text-muted" />
          <span className="mt-3 font-semibold">{isUploading ? t.requesting : t.chooseOrDrop}</span>
          <span className="mt-1 text-sm text-text-muted">{t.acceptedFormats}</span>
        </button>
        <input
          ref={inputRef}
          accept={wikiImageAcceptAttribute}
          aria-label={t.chooseOrDrop}
          className="sr-only"
          data-resource-type={resourceType}
          data-testid="wiki-image-upload-input"
          onChange={(event) => {
            selectFirstFile(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
          tabIndex={-1}
          type="file"
        />
        {selectedFile ? (
          <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-stroke-subtle bg-surface-base p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 truncate text-sm font-semibold">
              {t.selectedFile(selectedFile.name)}
            </p>
            <button
              className="w-fit rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isBusy}
              onClick={() => setSelectedFile(null)}
              type="button"
            >
              {t.removeSelectedFile}
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-text-strong sm:col-span-2">
          {t.sourceUrlLabel}
          <input
            className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2 font-normal"
            name="sourceUrl"
            onChange={(event) => {
              const sourceUrl = event.currentTarget.value;

              setSuccessMessage(null);
              setRequestForm((form) => ({ ...form, sourceUrl }));
            }}
            required
            type="url"
            value={requestForm.sourceUrl}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-text-strong">
          {t.sourceNameLabel}
          <input
            className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2 font-normal"
            name="sourceName"
            onChange={(event) => {
              const sourceName = event.currentTarget.value;

              setSuccessMessage(null);
              setRequestForm((form) => ({ ...form, sourceName }));
            }}
            required
            type="text"
            value={requestForm.sourceName}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-text-strong">
          {t.altTextLabel}
          <input
            className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2 font-normal"
            name="altText"
            onChange={(event) => {
              const altText = event.currentTarget.value;

              setSuccessMessage(null);
              setRequestForm((form) => ({ ...form, altText }));
            }}
            required
            type="text"
            value={requestForm.altText}
          />
        </label>
        <label className="flex gap-3 text-sm font-semibold text-text-strong sm:col-span-2">
          <input
            checked={requestForm.rightsConfirmed}
            className="mt-1 h-4 w-4 rounded border-stroke-subtle"
            onChange={(event) => {
              const rightsConfirmed = event.currentTarget.checked;

              setSuccessMessage(null);
              setRequestForm((form) => ({ ...form, rightsConfirmed }));
            }}
            type="checkbox"
          />
          <span>{t.rightsConfirmedLabel}</span>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">{t.requiredHint}</p>
        <button
          className="rounded-full border border-brand-primary bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSubmitRequest}
          onClick={() => {
            void submitRequest();
          }}
          type="button"
        >
          {isUploading ? t.requesting : t.submitRequest}
        </button>
      </div>
      {errorMessage ? (
        <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">{successMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
