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
  <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:px-8 sm:py-8">
    <div className="pointer-events-none absolute -top-20 right-4 size-64 rounded-full bg-emerald-50 blur-3xl" />
    <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div className="max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">
          <Sparkles className="size-3.5" /> Рабочее пространство · демо-режим
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
          Фабрика контента
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Создавайте, адаптируйте и публикуйте контент для всех каналов из
          одного рабочего пространства
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
        <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
          VK · Telegram · Max
        </span>
        <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
          Instagram · Яндекс.Дзен
        </span>
      </div>
    </div>

    <nav
      aria-label="Разделы Фабрики контента"
      className="relative mt-7 scrollbar-none flex gap-1 overflow-x-auto border-b border-slate-200"
    >
      {workspaceTabs.map((tab) => {
        const Icon = tab.icon;
        const current = activeSection === tab.id;
        return (
          <button
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative flex min-h-12 shrink-0 items-center gap-2.5 px-4 text-sm font-semibold transition sm:px-5",
              current
                ? "text-emerald-900"
                : "text-slate-500 hover:text-slate-800",
            )}
            key={tab.id}
            onClick={() => onSectionChange(tab.id)}
            type="button"
          >
            <Icon className="size-4" /> {tab.label}
            {current && (
              <span className="absolute right-4 bottom-[-1px] left-4 h-0.5 rounded-full bg-emerald-800 sm:right-5 sm:left-5" />
            )}
          </button>
        );
      })}
    </nav>
  </section>
);
