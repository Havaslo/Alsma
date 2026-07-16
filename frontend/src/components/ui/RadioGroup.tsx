import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type RadioOption = {
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
  legend,
  name,
  onValueChange,
  options,
  value,
  ...props
}: RadioGroupProps) => {
  return (
    <fieldset {...props}>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
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
          {option.label}
        </label>
      ))}
    </fieldset>
  );
};
