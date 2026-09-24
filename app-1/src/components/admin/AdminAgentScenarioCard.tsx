import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Save, Trash2 } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import type { AgentScenario } from "@/lib/admin/agent-scenarios-api";

const ACTION_OPTIONS = [
  { label: "Ответить текстом", value: "answer" },
  { label: "Открыть страницу", value: "open_page" },
  { label: "Передать менеджеру", value: "transfer" },
] as const;
const PAGE_OPTIONS = [
  { label: "Об отеле", value: "about" },
  { label: "Всё включено", value: "all-inclusive" },
  { label: "Праздники и мероприятия", value: "celebrations" },
  { label: "Развлечения", value: "entertainment" },
  { label: "Частые вопросы", value: "faq" },
  { label: "SPA", value: "spa" },
  { label: "Аппаратные процедуры", value: "hardware-procedures" },
  { label: "Номера", value: "rooms" },
  { label: "Акции и скидки", value: "offers" },
] as const;

export const AdminAgentScenarioCard = ({
  item,
  onDelete,
  onSave,
}: {
  readonly item: AgentScenario;
  readonly onDelete: () => void;
  readonly onSave: (item: AgentScenario) => void;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<AgentScenario>({ values: item });
  const enabled = useWatch({ control: form.control, name: "enabled" });
  const trigger = useWatch({ control: form.control, name: "trigger" });
  const action = useWatch({ control: form.control, name: "action" });

  return (
    <article className="rounded-3xl border border-line bg-page p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-brand">{item.title}</h3>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Применение: {trigger}
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
      <Form className="mt-5 space-y-5" form={form} onSubmit={onSave}>
        <div className="grid gap-5 lg:grid-cols-2">
          <TextField
            label="Название сценария"
            {...form.register("title", { required: true })}
          />
          <TextField
            label="Триггеры (через запятую)"
            {...form.register("trigger", { required: true })}
          />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block text-sm font-medium text-panel-foreground">
            <span>Следующее действие</span>
            <span className="mt-2 block rounded-xl border border-line bg-brand-foreground px-4 py-2.5">
              <Controller
                control={form.control}
                name="action"
                render={({ field }) => (
                  <DropdownSelect
                    ariaLabel={`Действие сценария ${item.title}`}
                    onChange={field.onChange}
                    options={ACTION_OPTIONS}
                    value={field.value}
                  />
                )}
              />
            </span>
          </label>
          {action === "open_page" && (
            <label className="block text-sm font-medium text-panel-foreground">
              <span>Страница перехода</span>
              <span className="mt-2 block rounded-xl border border-line bg-brand-foreground px-4 py-2.5">
                <Controller
                  control={form.control}
                  name="page"
                  render={({ field }) => (
                    <DropdownSelect
                      ariaLabel={`Страница сценария ${item.title}`}
                      onChange={field.onChange}
                      options={PAGE_OPTIONS}
                      value={field.value ?? "offers"}
                    />
                  )}
                />
              </span>
            </label>
          )}
        </div>
        <TextAreaField
          label="Текст сценария"
          rows={7}
          {...form.register("response", { required: true })}
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
        Сценарий будет удалён из базы данных.
      </ConfirmModal>
    </article>
  );
};
