import type { ComponentPropsWithoutRef } from "react";

import { formatRussianPhone } from "@/lib/phone-format";

export const PhoneInput = ({
  autoComplete = "tel",
  inputMode = "tel",
  onChange,
  placeholder = "+7 (___) ___-__-__",
  type = "tel",
  ...props
}: ComponentPropsWithoutRef<"input">) => (
  <input
    {...props}
    autoComplete={autoComplete}
    inputMode={inputMode}
    onChange={(event) => {
      event.currentTarget.value = formatRussianPhone(event.currentTarget.value);
      onChange?.(event);
    }}
    placeholder={placeholder}
    type={type}
  />
);
