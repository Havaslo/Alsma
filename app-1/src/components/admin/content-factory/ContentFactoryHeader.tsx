import {
  CalendarDays,
  History,
  Image as ImageIcon,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { WorkspaceSection } from "@/lib/content-factory/contentFactoryTypes";

const workspaceTabs: {
  id: WorkspaceSection;
  label: string;
  icon: typeof WandSparkles;
}[] = [
  { id: "create", label: "Создание", icon: WandSparkles },
  { id: "plan", label: "Контент-план", icon: CalendarDays },
  { id: "media", label: "Медиатека", icon: ImageIcon },
  { id: "history", label: "История и черновики", icon: History },
];

export const ContentFactoryHeader = ({
  activeSection,
  models,
  onSectionChange,
}: {
  activeSection: WorkspaceSection;
  models: { text: string; image: string } | null;
  onSectionChange: (section: WorkspaceSection) => void;
}) => (
  <section className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand sm:text-3xl">
          Фабрика контента
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-ui-foreground">
          Создавайте, проверяйте и планируйте публикации для всех каналов из
          одного места.
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-brand-foreground px-3 py-1.5 text-xs font-semibold text-muted-ui-foreground">
        <Sparkles className="size-3.5 text-brand" /> Тестовый режим · без
        публикации
      </span>
    </div>

    {models && (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-ui-foreground">
        <span className="font-semibold text-page-foreground">
          Модели генерации:
        </span>
        <span className="rounded-full border border-line bg-brand-foreground px-2.5 py-1">
          Текст · {models.text}
        </span>
        <span className="rounded-full border border-line bg-brand-foreground px-2.5 py-1">
          Фото · {models.image} · medium · с исходным фото
        </span>
      </div>
    )}

    <nav
      aria-label="Разделы Фабрики контента"
      className="scrollbar-none flex gap-8 overflow-x-auto border-b border-line"
    >
      {workspaceTabs.map((tab) => {
        const Icon = tab.icon;
        const current = activeSection === tab.id;
        return (
          <button
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition",
              current
                ? "border-brand text-brand"
                : "border-transparent text-muted-ui-foreground hover:text-page-foreground",
            )}
            key={tab.id}
            onClick={() => onSectionChange(tab.id)}
            type="button"
          >
            <Icon className="size-4" /> {tab.label}
          </button>
        );
      })}
    </nav>
  </section>
);
