import { useForm, useWatch } from "react-hook-form";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import type {
  KnowledgeRule,
  KnowledgeRuleInput,
} from "@/lib/admin/knowledge-base-api";
import { useSaveKnowledgeRule } from "@/lib/admin/useKnowledgeBase";

type RuleFormValues = Omit<KnowledgeRuleInput, "id">;
type KnowledgeChannel = KnowledgeRule["channels"][number];

export const KnowledgeRuleEditor = ({
  rule,
}: {
  readonly rule?: KnowledgeRule;
}) => {
  const save = useSaveKnowledgeRule();
  const form = useForm<RuleFormValues>({
    defaultValues: {
      channels: rule?.channels ?? ["text", "voice"],
      content: rule?.content ?? "",
      enabled: rule?.enabled ?? true,
      priority: rule?.priority ?? 100,
      title: rule?.title ?? "",
    },
  });
  const channels = useWatch({ control: form.control, name: "channels" });
  const enabled = useWatch({ control: form.control, name: "enabled" });
  const toggleChannel = (channel: KnowledgeChannel, checked: boolean) => {
    const next = checked
      ? [...new Set([...channels, channel])]
      : channels.filter((item) => item !== channel);
    if (next.length) form.setValue("channels", next, { shouldDirty: true });
  };

  return (
    <Form
      className="space-y-5"
      form={form}
      onSubmit={(values) => save.mutate({ ...values, id: rule?.id })}
    >
      <TextField
        error={form.formState.errors.title?.message}
        label="Название правила"
        placeholder="..."
        {...form.register("title", { required: "Укажите название" })}
      />
      <TextAreaField
        error={form.formState.errors.content?.message}
        label="Инструкция"
        placeholder="..."
        rows={7}
        {...form.register("content", { required: "Добавьте инструкцию" })}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <TextField
          label="Приоритет"
          min={0}
          placeholder="..."
          type="number"
          {...form.register("priority", { min: 0, valueAsNumber: true })}
        />
        <div>
          <span className="text-sm font-medium">Статус</span>
          <CheckboxField
            checked={enabled}
            className="mt-2 w-full"
            label="Активно"
            onChange={(checked) =>
              form.setValue("enabled", checked, { shouldDirty: true })
            }
          />
        </div>
      </div>
      <div>
        <span className="text-sm font-medium">Каналы</span>
        <div className="mt-2 flex flex-wrap gap-3">
          <CheckboxField
            checked={channels.includes("text")}
            label="Текст"
            onChange={(checked) => toggleChannel("text", checked)}
          />
          <CheckboxField
            checked={channels.includes("voice")}
            label="Голос"
            onChange={(checked) => toggleChannel("voice", checked)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button disabled={save.isPending} type="submit">
          Сохранить правило
        </Button>
      </div>
    </Form>
  );
};
