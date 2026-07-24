import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import {
  type MockTransferRule,
  TRANSFER_CONDITION_LABELS,
  TRANSFER_CONDITION_OPTIONS,
} from "@/lib/admin/admin-agent-scenario-mocks";

export const AdminAgentTransferRuleCard = ({
  item,
  onDelete,
  onSave,
}: {
  readonly item: MockTransferRule;
  readonly onDelete: () => void;
  readonly onSave: (item: MockTransferRule) => void;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<MockTransferRule>({ values: item });
  const condition = useWatch({ control: form.control, name: "condition" });
  const enabled = useWatch({ control: form.control, name: "enabled" });

  return (
    <article className="rounded-3xl border border-line bg-page p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-brand">{item.title}</h3>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Условие: {TRANSFER_CONDITION_LABELS[condition]} · Приоритет:{" "}
            {item.priority}
          </p>
        </div>
        <Button
          className="text-destructive"
          onClick={() => setConfirmDelete(true)}
          variant="secondary"
        >
          <Trash2 className="size-4" /> Удалить
        </Button>
      </header>
      <Form
        className="mt-5 space-y-5"
        form={form}
        onSubmit={(values) => {
          onSave(values);
          toast.success("Правило сохранено");
        }}
      >
        <TextField
          label="Название правила"
          placeholder="..."
          {...form.register("title", { required: true })}
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block text-sm font-medium text-panel-foreground">
            <span>Когда срабатывает</span>
            <span className="mt-2 block rounded-xl border border-line bg-brand-foreground px-4 py-2.5">
              <Controller
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <DropdownSelect
                    ariaLabel={`Условие правила ${item.title}`}
                    onChange={field.onChange}
                    options={TRANSFER_CONDITION_OPTIONS}
                    value={field.value}
                  />
                )}
              />
            </span>
          </label>
          <TextField
            label="Приоритет"
            min={0}
            type="number"
            {...form.register("priority", { valueAsNumber: true })}
          />
        </div>
        <TextAreaField
          label="Условия правила"
          placeholder="..."
          rows={5}
          {...form.register("description", { required: true })}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CheckboxField
            checked={enabled}
            className="min-w-48"
            label="Активно"
            onChange={(checked) =>
              form.setValue("enabled", checked, { shouldDirty: true })
            }
          />
          <Button type="submit">
            <Save className="size-4" /> Сохранить изменения
          </Button>
        </div>
      </Form>
      <ConfirmModal
        confirmLabel="Удалить правило"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete();
          setConfirmDelete(false);
        }}
        open={confirmDelete}
        title="Удалить правило?"
      >
        Правило будет удалено из текущего набора моковых данных.
      </ConfirmModal>
    </article>
  );
};
