import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Save, Trash2 } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import type { AgentTransferRule } from "@/lib/admin/agent-scenarios-api";

export const AdminAgentTransferRuleCard = ({
  item,
  onDelete,
  onSave,
}: {
  readonly item: AgentTransferRule;
  readonly onDelete: () => void;
  readonly onSave: (item: AgentTransferRule) => void;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<AgentTransferRule>({ values: item });
  const enabled = useWatch({ control: form.control, name: "enabled" });

  return (
    <article className="rounded-3xl border border-line bg-page p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-brand">{item.title}</h3>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Назначение: {item.destination}
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
        <TextField
          label="Название правила"
          {...form.register("title", { required: true })}
        />
        <TextAreaField
          label="Условие передачи менеджеру"
          rows={5}
          {...form.register("condition", { required: true })}
        />
        <TextField
          label="Назначение"
          {...form.register("destination", { required: true })}
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
        <p>Правило будет удалено из базы данных.</p>
      </ConfirmModal>
    </article>
  );
};
