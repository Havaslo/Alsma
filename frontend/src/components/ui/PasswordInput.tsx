import { type ComponentPropsWithRef, useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/cn";

export type PasswordInputProps = Omit<
  ComponentPropsWithRef<"input">,
  "type"
> & {
  readonly hidePasswordLabel?: string;
  readonly showPasswordLabel?: string;
};

export const PasswordInput = ({
  className,
  disabled,
  hidePasswordLabel = "Hide password",
  showPasswordLabel = "Show password",
  ...props
}: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = isVisible ? EyeOff : Eye;
  const visibilityLabel = isVisible ? hidePasswordLabel : showPasswordLabel;

  return (
    <div className="relative">
      <input
        className={cn("field-control pr-12", className)}
        disabled={disabled}
        type={isVisible ? "text" : "password"}
        {...props}
      />
      <button
        aria-label={visibilityLabel}
        className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-ui-foreground transition hover:bg-muted-ui/70 hover:text-panel-foreground focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => setIsVisible((visible) => !visible)}
        title={visibilityLabel}
        type="button"
      >
        <Icon aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
};
