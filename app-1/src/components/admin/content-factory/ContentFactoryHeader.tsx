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
  { id: "history", label: "История публикаций", icon: History },
];

export const ContentFactoryHeader = ({
  activeSection,
  onSectionChange,
}: {
  activeSection: WorkspaceSection;
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
        <Sparkles className="size-3.5 text-brand" /> Демо · без отправки в
        каналы
      </span>
    </div>

    <nav
      aria-label="Разделы Фабрики контента"
      className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line"
    >
      {workspaceTabs.map((tab) => {
        const Icon = tab.icon;
        const current = activeSection === tab.id;
        return (
          <button
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 shrink-0 items-center gap-2 rounded-t-xl px-4 text-sm font-semibold transition",
              current
                ? "bg-brand text-brand-foreground"
                : "text-muted-ui-foreground hover:bg-muted-ui/40 hover:text-brand",
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
