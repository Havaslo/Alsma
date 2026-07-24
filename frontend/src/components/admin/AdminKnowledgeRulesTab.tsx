import { Plus } from "lucide-react";

import { KnowledgeRuleEditor } from "@/components/admin/KnowledgeRuleEditor";
import { Button } from "@/components/ui/Button";
import type { KnowledgeRule } from "@/lib/admin/knowledge-base-api";
import { cn } from "@/lib/cn";

export const AdminKnowledgeRulesTab = ({
  onSelect,
  rules,
  selectedId,
  selectedRule,
}: {
  readonly onSelect: (id: string | null) => void;
  readonly rules: KnowledgeRule[];
  readonly selectedId: string | null | undefined;
  readonly selectedRule?: KnowledgeRule;
}) => (
  <section className="grid items-start gap-6 xl:grid-cols-[0.8fr_1.2fr]">
    <article className="rounded-3xl border border-line bg-brand-foreground p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-brand">Правила агента</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-ui-foreground">
            Правила задают поведение агента и не смешиваются со статьями.
          </p>
        </div>
        <Button onClick={() => onSelect(null)} variant="secondary">
          <Plus className="size-4" />
          Новое правило
        </Button>
      </div>
      <div className="mt-5 space-y-3">
        {rules.map((rule) => (
          <button
            className={cn(
              "w-full rounded-2xl border p-4 text-left transition",
              selectedId === rule.id
                ? "border-brand bg-brand/5"
                : "border-line bg-page hover:border-brand/40",
            )}
            key={rule.id}
            onClick={() => onSelect(rule.id)}
            type="button"
          >
            <span className="flex items-start justify-between gap-3">
              <strong className="text-brand">{rule.title}</strong>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                {rule.enabled ? "Активно" : "Отключено"}
              </span>
            </span>
            <span className="mt-2 block text-sm leading-6">{rule.content}</span>
            <span className="mt-3 block text-xs text-muted-ui-foreground">
              Приоритет {rule.priority} · Каналы: {rule.channels.join(", ")}
            </span>
          </button>
        ))}
        {!rules.length && (
          <p className="rounded-2xl bg-page p-5 text-sm text-muted-ui-foreground">
            Правил пока нет.
          </p>
        )}
      </div>
    </article>

    <article className="rounded-3xl border border-line bg-brand-foreground p-6">
      <h2 className="text-xl font-semibold text-brand">
        Правило поведения агента
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
        Здесь задаются ограничения и стиль ответа для текстового и голосового
        агента.
      </p>
      <div className="mt-6">
        <KnowledgeRuleEditor
          key={selectedRule?.id ?? "new"}
          rule={selectedRule}
        />
      </div>
    </article>
  </section>
);
