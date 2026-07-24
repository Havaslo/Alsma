import { useState } from "react";

import { AdminEntertainmentAnimationForm } from "@/components/admin/AdminEntertainmentAnimationForm";
import { AdminEntertainmentEquipmentForm } from "@/components/admin/AdminEntertainmentEquipmentForm";
import { AdminEntertainmentKidsForm } from "@/components/admin/AdminEntertainmentKidsForm";
import { AdminEntertainmentSeasonForm } from "@/components/admin/AdminEntertainmentSeasonForm";
import { Loader } from "@/components/ui/Loader";
import { cn } from "@/lib/cn";
import { useAdminSiteContent } from "@/lib/site/useSiteContent";

const tabs = [
  { id: "seasons", label: "Сезонные активности" },
  { id: "animation", label: "Программа анимации" },
  { id: "kids", label: "Детские услуги" },
  { id: "equipment", label: "Прокат оборудования" },
] as const;

type EntertainmentTab = (typeof tabs)[number]["id"];

export const AdminEntertainmentEditor = () => {
  const [tab, setTab] = useState<EntertainmentTab>("seasons");
  const content = useAdminSiteContent("entertainment");

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
        <h1 className="mt-2 text-3xl font-semibold text-brand">Развлечения</h1>
        <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
          Настройте сезонные предложения, анимацию, детские услуги и прокат.
        </p>
      </section>
      <nav
        aria-label="Разделы страницы развлечений"
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
      {tab === "seasons" && (
        <AdminEntertainmentSeasonForm items={content.data?.items} />
      )}
      {tab === "animation" && (
        <AdminEntertainmentAnimationForm items={content.data?.items} />
      )}
      {tab === "kids" && (
        <AdminEntertainmentKidsForm items={content.data?.items} />
      )}
      {tab === "equipment" && (
        <AdminEntertainmentEquipmentForm items={content.data?.items} />
      )}
    </div>
  );
};
