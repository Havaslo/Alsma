import { useState } from "react";

import { AdminRoomCardsForm } from "@/components/admin/AdminRoomCardsForm";
import { AdminRoomComparisonForm } from "@/components/admin/AdminRoomComparisonForm";
import { Loader } from "@/components/ui/Loader";
import { cn } from "@/lib/cn";
import { useAdminSiteContent } from "@/lib/site/useSiteContent";

const tabs = [
  { id: "cards", label: "Карточки номеров" },
  { id: "comparison", label: "Сравнительная таблица" },
] as const;

type RoomsTab = (typeof tabs)[number]["id"];

export const AdminRoomsEditor = () => {
  const [tab, setTab] = useState<RoomsTab>("cards");
  const content = useAdminSiteContent("rooms");

  if (content.isLoading)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader className="text-brand" label="Загрузка редактора" size="lg" />
      </div>
    );

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold tracking-wide text-muted-ui-foreground uppercase">
          Управление сайтом
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-brand">Проживание</h1>
        <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
          Настройте карточки номеров, фотогалереи и публичное сравнение
          категорий.
        </p>
      </section>

      <nav
        aria-label="Разделы страницы проживания"
        className="scrollbar-none flex gap-7 overflow-x-auto border-b border-line"
      >
        {tabs.map((item) => (
          <button
            aria-current={tab === item.id ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-1 pb-4 text-sm font-semibold transition",
              tab === item.id
                ? "border-brand text-brand"
                : "border-transparent text-muted-ui-foreground hover:text-brand",
            )}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "cards" && <AdminRoomCardsForm items={content.data?.items} />}
      {tab === "comparison" && (
        <AdminRoomComparisonForm items={content.data?.items} />
      )}
    </div>
  );
};
