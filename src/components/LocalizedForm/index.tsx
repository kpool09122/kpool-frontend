"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { I18nDictionary } from "@/i18n/dictionaries";

type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const isFormField = (target: EventTarget | null): target is FormField =>
  target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

const localizeValidity = (field: FormField, t: I18nDictionary["common"]["validation"]) => {
  field.setCustomValidity("");
  const validity = field.validity;
  if (validity.valid) return;
  const message = validity.valueMissing ? t.required
    : validity.typeMismatch ? (field instanceof HTMLInputElement && field.type === "email" ? t.email : t.url)
    : validity.patternMismatch ? t.pattern
    : validity.rangeOverflow || validity.rangeUnderflow || validity.stepMismatch ? t.range
    : validity.tooLong || validity.tooShort ? t.length
    : t.invalid;
  field.setCustomValidity(message);
};

export function LocalizedForm({ onInvalidCapture, onInputCapture, ...props }: ComponentProps<"form">) {
  const { dictionary } = useI18n();
  const t = dictionary.common.validation;
  const invalidFields = useRef(new Set<FormField>());

  useEffect(() => {
    for (const field of invalidFields.current) {
      if (field.isConnected) localizeValidity(field, t);
      else invalidFields.current.delete(field);
    }
  }, [t]);

  return <form {...props}
    onInvalidCapture={(event) => {
      if (isFormField(event.target)) {
        localizeValidity(event.target, t);
        invalidFields.current.add(event.target);
      }
      onInvalidCapture?.(event);
    }}
    onInputCapture={(event) => {
      if (isFormField(event.target) && invalidFields.current.has(event.target)) {
        event.target.setCustomValidity("");
        invalidFields.current.delete(event.target);
      }
      onInputCapture?.(event);
    }}
  />;
}
