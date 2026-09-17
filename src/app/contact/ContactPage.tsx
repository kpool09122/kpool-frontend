"use client";

import { useState, type FormEvent } from "react";

import {
  submitContact,
  type SubmitContactAdapter,
} from "@/gateways/contact/contactBrowserApi";
import { useI18n } from "../../i18n/I18nProvider";

type ContactPageProps = {
  initialEmail?: string;
  initialName?: string;
  submitContactAdapter?: SubmitContactAdapter;
};

type ContactFormValues = {
  category: string;
  content: string;
  email: string;
  name: string;
};

const getInitialValues = ({
  initialEmail = "",
  initialName = "",
}: ContactPageProps): ContactFormValues => ({
  category: "1",
  content: "",
  email: initialEmail,
  name: initialName,
});

const fieldClassName =
  "mt-2 w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-sm text-text-strong outline-none transition placeholder:text-text-muted/70 focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight disabled:cursor-not-allowed disabled:opacity-70";

type SubmissionState = "idle" | "submitting" | "success" | "error";

export function ContactPage({
  initialEmail,
  initialName,
  submitContactAdapter = submitContact,
}: ContactPageProps) {
  const { dictionary, locale } = useI18n();
  const t = dictionary.contact;
  const [values, setValues] = useState<ContactFormValues>(() =>
    getInitialValues({ initialEmail, initialName }),
  );
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const isSubmitting = submissionState === "submitting";

  const setField = (field: keyof ContactFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setSubmissionState("idle");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionState("submitting");

    const result = await submitContactAdapter({
      locale,
      requestBody: {
        category: Number(values.category) as 1 | 2 | 3 | 99,
        name: values.name,
        email: values.email,
        content: values.content,
      },
    });

    setSubmissionState(result.ok ? "success" : "error");
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-10 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-28">
          <h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1>
          <p className="text-sm leading-7 text-text-muted">{t.description}</p>
        </div>

        <section className="rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft sm:p-8">
          <p className="mb-6 text-sm text-text-muted">{t.requiredHint}</p>
          <form
            aria-busy={isSubmitting}
            className="space-y-5"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <label className="block text-sm font-semibold text-text-strong">
              <span>{t.category}</span>
              <select
                className={fieldClassName}
                disabled={isSubmitting}
                name="category"
                required
                value={values.category}
                onChange={(event) => setField("category", event.target.value)}
              >
                <option value="1">{t.categories.suggestions}</option>
                <option value="2">{t.categories.bugReport}</option>
                <option value="3">{t.categories.contentIssue}</option>
                <option value="99">{t.categories.other}</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-text-strong">
              <span>{t.name}</span>
              <input
                autoComplete="name"
                className={fieldClassName}
                disabled={isSubmitting}
                maxLength={32}
                name="name"
                placeholder={t.namePlaceholder}
                required
                type="text"
                value={values.name}
                onChange={(event) => setField("name", event.target.value)}
              />
            </label>

            <label className="block text-sm font-semibold text-text-strong">
              <span>{t.email}</span>
              <input
                autoComplete="email"
                className={fieldClassName}
                disabled={isSubmitting}
                name="email"
                placeholder={t.emailPlaceholder}
                required
                type="email"
                value={values.email}
                onChange={(event) => setField("email", event.target.value)}
              />
            </label>

            <label className="block text-sm font-semibold text-text-strong">
              <span>{t.content}</span>
              <textarea
                aria-describedby="contact-content-count"
                className={`${fieldClassName} min-h-48 resize-y leading-7`}
                disabled={isSubmitting}
                maxLength={512}
                name="content"
                placeholder={t.contentPlaceholder}
                required
                value={values.content}
                onChange={(event) => setField("content", event.target.value)}
              />
            </label>
            <p
              aria-live="polite"
              className="-mt-3 text-right text-xs text-text-muted"
              id="contact-content-count"
            >
              {t.characterCount(values.content.length)}
            </p>

            <button
              className="inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-brand-highlight focus:ring-offset-2 focus:ring-offset-surface-raised disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? t.submitting : t.submit}
            </button>

            {submissionState === "success" ? (
              <p
                className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800"
                role="status"
              >
                {t.submitSuccess}
              </p>
            ) : null}
            {submissionState === "error" ? (
              <p
                className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800"
                role="alert"
              >
                {t.submitError}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}
