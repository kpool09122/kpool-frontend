"use client";

import type { ComponentProps } from "react";

export const AutoSubmitSelect = (props: ComponentProps<"select">) => (
  <select
    {...props}
    onChange={(event) => {
      props.onChange?.(event);
      event.currentTarget.form?.requestSubmit();
    }}
  />
);
