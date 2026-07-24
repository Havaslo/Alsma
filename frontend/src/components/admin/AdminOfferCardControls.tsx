import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CheckboxField, TextField } from "@/components/ui/FormField";

export const AdminOfferCardControls = <TValues extends FieldValues>({
  active,
  activeLabel = "Показывать карточку",
  form,
  index,
  onDelete,
}: {
  readonly active: boolean;
  readonly activeLabel?: string;
  readonly form: UseFormReturn<TValues>;
  readonly index: number;
  readonly onDelete: () => void;
}) => {
  const activePath = `items.${index}.isActive` as Path<TValues>;
  const orderPath = `items.${index}.sortOrder` as Path<TValues>;

  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-3 sm:items-end">
      <TextField
        label="Порядок"
        min={0}
        type="number"
        {...form.register(orderPath, { valueAsNumber: true })}
      />
      <CheckboxField
        checked={active}
        className="w-full"
        label={activeLabel}
        onChange={(checked) =>
          form.setValue(activePath, checked as never, { shouldDirty: true })
        }
      />
      <Button
        className="w-full text-destructive"
        onClick={onDelete}
        variant="secondary"
      >
        <Trash2 className="size-4" /> Удалить
      </Button>
    </div>
  );
};
