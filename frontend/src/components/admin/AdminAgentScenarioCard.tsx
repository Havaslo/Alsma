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
  AGENT_SCENARIO_TRIGGER_LABELS,
  AGENT_SCENARIO_TRIGGER_OPTIONS,
  type MockAgentScenario,
} from "@/lib/admin/admin-agent-scenario-mocks";

export const AdminAgentScenarioCard = ({
  item,
  onDelete,
  onSave,
}: {
  readonly item: MockAgentScenario;
  readonly onDelete: () => void;
  readonly onSave: (item: MockAgentScenario) => void;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<MockAgentScenario>({ values: item });
  const enabled = useWatch({ control: form.control, name: "enabled" });
  const trigger = useWatch({ control: form.control, name: "trigger" });

  return (
    <article className="rounded-3xl border border-line bg-page p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-brand">{item.title}</h3>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Применение: {AGENT_SCENARIO_TRIGGER_LABELS[trigger]}
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
          toast.success("Сценарий сохранён");
        }}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <TextField
            label="Название сценария"
            placeholder="..."
            {...form.register("title", { required: true })}
          />
          <label className="block text-sm font-medium text-panel-foreground">
            <span>Где применяется</span>
            <span className="mt-2 block rounded-xl border border-line bg-brand-foreground px-4 py-2.5">
              <Controller
                control={form.control}
                name="trigger"
                render={({ field }) => (
                  <DropdownSelect
                    ariaLabel={`Область применения сценария ${item.title}`}
                    onChange={field.onChange}
                    options={AGENT_SCENARIO_TRIGGER_OPTIONS}
                    value={field.value}
                  />
                )}
              />
            </span>
          </label>
        </div>
        <TextAreaField
          label="Текст сценария"
          placeholder="..."
          rows={5}
          {...form.register("response", { required: true })}
        />
        <TextAreaField
          label="Дополнительные указания"
          placeholder="..."
          rows={4}
          {...form.register("instructions")}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CheckboxField
            checked={enabled}
            className="min-w-48"
            label="Активен"
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
        confirmLabel="Удалить сценарий"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete();
          setConfirmDelete(false);
        }}
        open={confirmDelete}
        title="Удалить сценарий?"
      >
        Сценарий будет удалён из текущего набора моковых данных.
      </ConfirmModal>
    </article>
  );
};
