import { useForm } from "react-hook-form";

import { Save } from "lucide-react";

import { Form } from "@/components/Form";
import type { KnowledgeRule } from "@/lib/admin/knowledge-base-api";
import { useSaveKnowledgeRule } from "@/lib/admin/useKnowledgeBase";

export const KnowledgeRuleEditor = ({
  rule,
}: {
  readonly rule?: KnowledgeRule;
}) => {
  const save = useSaveKnowledgeRule();
  const form = useForm<
    Pick<KnowledgeRule, "content" | "enabled" | "priority" | "title">
  >({
    defaultValues: {
      content: rule?.content ?? "",
      enabled: rule?.enabled ?? true,
      priority: rule?.priority ?? 100,
      title: rule?.title ?? "",
    },
  });

  return (
    <Form
      className="grid gap-4 rounded-3xl border border-line bg-page p-5"
      form={form}
      onSubmit={(values) => {
        save.mutate({ ...values, id: rule?.id });
      }}
    >
      <input
        className="rounded-2xl border border-line bg-panel px-4 py-3"
        placeholder="Название правила"
        {...form.register("title", { required: true })}
      />
      <textarea
        className="min-h-32 rounded-2xl border border-line bg-panel px-4 py-3"
        placeholder="Инструкция для агента"
        {...form.register("content", { required: true })}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="text-sm">
          Приоритет
          <input
            className="mt-2 block w-28 rounded-xl border border-line bg-panel px-4 py-3"
            min={0}
            type="number"
            {...form.register("priority", { min: 0, valueAsNumber: true })}
          />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("enabled")} /> Активно
        </label>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
          type="submit"
        >
          <Save className="size-4" /> Сохранить
        </button>
      </div>
    </Form>
  );
};
