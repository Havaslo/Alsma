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
      <legend className="mb-3 font-heading text-sm font-semibold tracking-tight text-panel-foreground">
        {legend}
      </legend>
      {options.map((option) => (
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-2xl border border-line/70 bg-panel/70 px-4 py-3 text-panel-foreground shadow-sm shadow-page-foreground/5 transition hover:border-brand/40 hover:bg-brand/5 has-checked:border-brand/50 has-checked:bg-brand/10",
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
            <span className="absolute inset-0 rounded-full border border-line bg-muted-ui transition-[border-color,background-color,box-shadow] duration-200 peer-checked:border-brand peer-checked:bg-brand/15 peer-focus-visible:ring-4 peer-focus-visible:ring-focus/15" />
            <span className="absolute inset-1.5 scale-0 rounded-full bg-brand transition-transform duration-200 ease-out peer-checked:scale-100" />
          </span>
          <span className="grid gap-1 text-sm">
            <span className="font-medium">{option.label}</span>
            {option.description && (
              <span className="text-muted-ui-foreground">
                {option.description}
              </span>
            )}
          </span>
        </label>
      ))}
    </fieldset>
  );
};
