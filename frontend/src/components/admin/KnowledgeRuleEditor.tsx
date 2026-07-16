import { useState } from "react";

import { Save } from "lucide-react";

import type { KnowledgeRule } from "@/lib/admin/knowledge-base-api";
import { useSaveKnowledgeRule } from "@/lib/admin/useKnowledgeBase";

export const KnowledgeRuleEditor = ({
  rule,
}: {
  readonly rule?: KnowledgeRule;
}) => {
  const [title, setTitle] = useState(rule?.title ?? "");
  const [content, setContent] = useState(rule?.content ?? "");
  const [priority, setPriority] = useState(rule?.priority ?? 100);
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const save = useSaveKnowledgeRule();
  return (
    <form
      className="grid gap-4 rounded-3xl border border-line bg-page p-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ content, enabled, id: rule?.id, priority, title });
      }}
    >
      <input
        className="rounded-2xl border border-line bg-panel px-4 py-3"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Название правила"
        required
        value={title}
      />
      <textarea
        className="min-h-32 rounded-2xl border border-line bg-panel px-4 py-3"
        onChange={(event) => setContent(event.target.value)}
        placeholder="Инструкция для агента"
        required
        value={content}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="text-sm">
          Приоритет
          <input
            className="mt-2 block w-28 rounded-xl border border-line bg-panel px-4 py-3"
            min="0"
            onChange={(event) => setPriority(Number(event.target.value))}
            type="number"
            value={priority}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            type="checkbox"
          />{" "}
          Активно
        </label>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
          type="submit"
        >
          <Save className="size-4" /> Сохранить
        </button>
      </div>
    </form>
  );
};
