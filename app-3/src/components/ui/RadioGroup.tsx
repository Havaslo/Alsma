import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type RadioOption = {
  readonly description?: ReactNode;
  readonly disabled?: boolean;
  readonly label: ReactNode;
  readonly value: string;
};

export type RadioGroupProps = Omit<
  ComponentPropsWithoutRef<"fieldset">,
  "children"
> & {
  readonly defaultValue?: string;
  readonly legend: ReactNode;
  readonly name: string;
  readonly onValueChange?: (value: string) => void;
  readonly options: readonly RadioOption[];
  readonly value?: string;
};

export const RadioGroup = ({
  defaultValue,
  className,
  legend,
  name,
  onValueChange,
  options,
  value,
  ...props
}: RadioGroupProps) => {
  return (
    <fieldset className={cn("space-y-3", className)} {...props}>
      <legend className="mb-3 font-primary text-sm font-semibold tracking-tight text-surface-foreground">
        {legend}
      </legend>
      {options.map((option) => (
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-surface/70 px-4 py-3 text-surface-foreground shadow-sm shadow-foreground/5 transition hover:border-primary/40 hover:bg-primary/5 has-checked:border-primary/50 has-checked:bg-primary/10",
            option.disabled && "cursor-not-allowed opacity-50",
          )}
          key={option.value}
        >
          <span className="relative mt-0.5 size-5 shrink-0">
            <input
              className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              checked={value === undefined ? undefined : value === option.value}
              defaultChecked={
                value === undefined ? defaultValue === option.value : undefined
              }
              disabled={option.disabled}
              name={name}
              onChange={() => onValueChange?.(option.value)}
              type="radio"
              value={option.value}
            />
            <span className="absolute inset-0 rounded-full border border-border bg-muted transition-[border-color,background-color,box-shadow] duration-200 peer-checked:border-primary peer-checked:bg-primary/15 peer-focus-visible:ring-4 peer-focus-visible:ring-ring/15" />
            <span className="absolute inset-1.5 scale-0 rounded-full bg-primary transition-transform duration-200 ease-out peer-checked:scale-100" />
          </span>
          <span className="grid gap-1 text-sm">
            <span className="font-medium">{option.label}</span>
            {option.description && (
              <span className="text-muted-foreground">
                {option.description}
              </span>
            )}
          </span>
        </label>
      ))}
    </fieldset>
  );
};
