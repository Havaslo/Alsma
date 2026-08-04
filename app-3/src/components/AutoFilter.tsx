import type { ComponentPropsWithoutRef } from "react";

import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/cn";

type FilterFieldBase = {
  readonly key: string;
  readonly label: string;
};

export type AutoFilterField =
  | (FilterFieldBase & {
      readonly placeholder?: string;
      readonly type: "text";
    })
  | (FilterFieldBase & {
      readonly options: readonly SelectOption[];
      readonly placeholder?: string;
      readonly type: "select";
    })
  | (FilterFieldBase & {
      readonly description?: string;
      readonly type: "toggle";
    });

export type AutoFilterValue = boolean | string;
export type AutoFilterValues = Readonly<
  Record<string, AutoFilterValue | undefined>
>;

export type AutoFilterProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "onChange"
> & {
  /** Schema that controls which filter inputs are rendered. */
  readonly fields: readonly AutoFilterField[];
  /** Emits the complete filter value object after every change. */
  readonly onChange: (values: AutoFilterValues) => void;
  readonly onReset?: () => void;
  readonly resetLabel?: string;
  /** Controlled values keyed by each field's key. */
  readonly values: AutoFilterValues;
};

export const AutoFilter = ({
  className,
  fields,
  onChange,
  onReset,
  resetLabel = "Reset filters",
  values,
  ...props
}: AutoFilterProps) => {
  const updateValue = (key: string, value: AutoFilterValue) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className={cn("grid gap-4", className)} {...props}>
      {fields.map((field) => {
        const value = values[field.key];

        if (field.type === "text") {
          return (
            <label className="grid gap-2 text-sm font-medium" key={field.key}>
              {field.label}
              <SearchInput
                onClear={() => updateValue(field.key, "")}
                onChange={(event) => updateValue(field.key, event.target.value)}
                placeholder={field.placeholder}
                value={typeof value === "string" ? value : ""}
              />
            </label>
          );
        }

        if (field.type === "select") {
          return (
            <div className="grid gap-2 text-sm font-medium" key={field.key}>
              <span>{field.label}</span>
              <Select
                aria-label={field.label}
                onValueChange={(nextValue) => updateValue(field.key, nextValue)}
                options={field.options}
                placeholder={field.placeholder}
                value={typeof value === "string" ? value : undefined}
              />
            </div>
          );
        }

        return (
          <div
            className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/25 p-4 shadow-sm shadow-foreground/5"
            key={field.key}
          >
            <span className="grid gap-1">
              <span className="text-sm font-medium">{field.label}</span>
              {field.description && (
                <span className="text-xs text-muted-foreground">
                  {field.description}
                </span>
              )}
            </span>
            <Toggle
              aria-label={field.label}
              checked={value === true}
              onChange={(event) => updateValue(field.key, event.target.checked)}
            />
          </div>
        );
      })}
      {onReset && (
        <Button className="w-full" onClick={onReset} variant="secondary">
          {resetLabel}
        </Button>
      )}
    </div>
  );
};
