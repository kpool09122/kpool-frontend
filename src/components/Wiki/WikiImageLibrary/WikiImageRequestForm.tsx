import { ArrowRightIcon, ImageIcon, UploadIcon } from "@radix-ui/react-icons";

import {
  formatWikiImageLicense,
  wikiImageAcceptAttribute,
  wikiImageAuthorMaxLength,
  wikiImageLicenseOptions,
} from "@kpool/wiki";
import { ImageCropper } from "../../ImageCropper";
import { TrashIcon } from "../icons";
import {
  type WikiImageLibraryDictionary,
  type WikiImageRequestFormController,
} from "./types";

const fieldClassName = "min-h-11 w-full min-w-0 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 font-normal text-text-strong transition focus-visible:border-brand-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary";

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
    cropState,
    errorMessage,
    inputRef,
    isDragActive,
    requestForm,
    selectedFile,
    selectedFileDataUrl,
    successMessage,
    cancelSelectedFileCrop,
    clearSelectedFile,
    confirmSelectedFileCrop,
    reportImageCropError,
    selectFirstFile,
    setIsDragActive,
    setRequestForm,
    setSuccessMessage,
    submitRequest,
  } = controller;
  const canSelectFile = !selectedFile && !cropState;

  return (
    <div
      aria-labelledby="wiki-image-library-request-tab"
      className="grid gap-5"
      id="wiki-image-library-request-panel"
      role="tabpanel"
    >
      {cropState ? (
        <ImageCropper
          disabled={isBusy}
          size="compact"
          sourceDataUrl={cropState.sourceDataUrl}
          t={t.cropper}
          onCancel={cancelSelectedFileCrop}
          onConfirm={confirmSelectedFileCrop}
          onError={reportImageCropError}
        />
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-8">
        <section aria-labelledby="wiki-image-request-image-title" className="grid min-w-0 gap-3">
          <div className="flex min-h-11 items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold" id="wiki-image-request-image-title">
              <ImageIcon aria-hidden="true" className="size-4 text-text-muted" />
              {t.requestImageHeading}
            </h3>
            {selectedFile ? (
            <button
              aria-label={t.removeSelectedFile}
              className="inline-flex size-11 items-center justify-center rounded-lg text-text-muted transition hover:bg-status-danger/10 hover:text-status-danger focus-visible:outline-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isBusy}
              onClick={clearSelectedFile}
              title={t.removeSelectedFile}
              type="button"
            >
              <TrashIcon />
            </button>
            ) : null}
          </div>
          {canSelectFile ? (
            <>
              <button
                className={`flex min-h-40 w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
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
                <UploadIcon className="h-6 w-6 text-brand-primary" />
                <span className="mt-2 text-sm font-semibold">{isUploading ? t.requesting : t.chooseOrDrop}</span>
                <span className="mt-1 text-xs text-text-muted">{t.acceptedFormats}</span>
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
            </>
          ) : null}
          {selectedFile ? (
            <figure className="overflow-hidden rounded-xl border border-stroke-subtle bg-surface-base">
              {selectedFileDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={t.selectedImagePreviewAlt}
                  className="block h-auto w-full"
                  src={selectedFileDataUrl}
                />
              ) : null}
            </figure>
          ) : null}
          <div className="grid gap-1 text-xs leading-relaxed text-text-muted">
            <p>{t.requestDescriptionApproved}</p>
            <p>{t.requestDescriptionSharedLanguages}</p>
          </div>
        </section>

        <div className="min-w-0">
          <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <label className="grid min-w-0 content-start gap-1.5 text-sm font-medium text-text-strong sm:col-span-2">
              {t.sourceUrlLabel}
              <input
                className={fieldClassName}
                name="sourceUrl"
                placeholder="https://"
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
            <label className="grid min-w-0 content-start gap-1.5 text-sm font-medium text-text-strong sm:col-span-2">
              {t.sourceNameLabel}
              <input
                className={fieldClassName}
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
            <label className="grid min-w-0 content-start gap-1.5 text-sm font-medium text-text-strong">
              {t.authorLabel}
              <input
                className={fieldClassName}
                maxLength={wikiImageAuthorMaxLength}
                name="author"
                onChange={(event) => {
                  const author = event.currentTarget.value;

                  setSuccessMessage(null);
                  setRequestForm((form) => ({ ...form, author }));
                }}
                required
                type="text"
                value={requestForm.author}
              />
            </label>
            <label className="grid min-w-0 content-start gap-1.5 text-sm font-medium text-text-strong">
              {t.licenseLabel}
              <select
                className={fieldClassName}
                name="license"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  const license = wikiImageLicenseOptions.find((option) => option === value) ?? "";

                  setSuccessMessage(null);
                  setRequestForm((form) => ({ ...form, license }));
                }}
                required
                value={requestForm.license}
              >
                <option value="">{t.selectLicense}</option>
                {wikiImageLicenseOptions.map((license) => (
                  <option key={license} value={license}>{formatWikiImageLicense(license)}</option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 content-start gap-1.5 text-sm font-medium text-text-strong sm:col-span-2">
              {t.altTextLabel}
              <input
                className={fieldClassName}
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
          </div>
          <label className="mt-4 flex items-start gap-3 border-t border-stroke-subtle pt-4 text-sm font-medium text-text-strong">
            <input
              checked={requestForm.rightsConfirmed}
              className="mt-0.5 size-4 shrink-0 rounded accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
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
      </div>

      {errorMessage ? (
        <p role="alert" className="rounded-xl border border-status-danger bg-status-danger/10 px-4 py-3 text-sm font-semibold text-status-danger">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <div role="status" className="rounded-xl border border-status-success bg-status-success/10 px-4 py-3 text-sm text-status-success">
          <p className="font-semibold">{successMessage}</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 border-t border-stroke-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">{t.requiredHint}</p>
        <button
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-on-primary transition enabled:hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:bg-stroke-subtle disabled:text-text-muted"
          disabled={!canSubmitRequest}
          onClick={() => {
            void submitRequest();
          }}
          type="button"
        >
          {isUploading ? t.requesting : t.submitRequest}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
