import { type ComponentPropsWithoutRef, type ReactNode, useId } from "react";

import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

type FieldShellProps = {
  readonly children: ReactNode;
  readonly error?: string;
  readonly label: string;
};

const FieldShell = ({ children, error, label }: FieldShellProps) => (
  <label className="block text-sm font-medium text-panel-foreground">
    <span>{label}</span>
    <span className="mt-2 block">{children}</span>
    {error && (
      <span className="mt-1.5 block text-xs text-destructive">{error}</span>
    )}
  </label>
);

export const TextField = ({
  error,
  label,
  ...props
}: ComponentPropsWithoutRef<"input"> & {
  readonly error?: string;
  readonly label: string;
}) => (
  <FieldShell error={error} label={label}>
    <input aria-invalid={Boolean(error)} className="field-control" {...props} />
  </FieldShell>
);

export const TextAreaField = ({
  error,
  label,
  rows = 4,
  ...props
}: ComponentPropsWithoutRef<"textarea"> & {
  readonly error?: string;
  readonly label: string;
}) => (
  <FieldShell error={error} label={label}>
    <textarea
      aria-invalid={Boolean(error)}
      className="field-control resize-y"
      rows={rows}
      {...props}
    />
  </FieldShell>
);

export const CheckboxField = ({
  checked,
  className,
  label,
  onChange,
}: {
  readonly checked: boolean;
  readonly className?: string;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}) => {
  const id = useId();
  return (
    <label
      className={cn(
        "inline-flex min-h-11 items-center gap-3 rounded-xl border border-line/70 bg-panel/80 px-4 py-2.5 text-sm font-medium",
        className,
      )}
      htmlFor={id}
    >
      <input
        checked={checked}
        className="peer sr-only"
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="grid size-5 place-items-center rounded border border-line bg-page text-transparent transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-foreground peer-focus-visible:ring-4 peer-focus-visible:ring-focus/20">
        <Check className="size-3.5" />
      </span>
      {label}
    </label>
  );
};
