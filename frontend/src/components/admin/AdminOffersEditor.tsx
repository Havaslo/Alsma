import { useState } from "react";

import { AdminOffersEventsForm } from "@/components/admin/AdminOffersEventsForm";
import { AdminOffersProposalsForm } from "@/components/admin/AdminOffersProposalsForm";
import { AdminOffersScenariosForm } from "@/components/admin/AdminOffersScenariosForm";
import { Loader } from "@/components/ui/Loader";
import { cn } from "@/lib/cn";
import { useAdminSiteContent } from "@/lib/site/useSiteContent";

const tabs = [
  { id: "proposals", label: "Предложения" },
  { id: "scenarios", label: "Готовые сценарии" },
  { id: "events", label: "Мероприятия" },
] as const;

type OffersTab = (typeof tabs)[number]["id"];

export const AdminOffersEditor = () => {
  const [tab, setTab] = useState<OffersTab>("proposals");
  const content = useAdminSiteContent("offers");

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
        <h1 className="mt-2 text-3xl font-semibold text-brand">Акции</h1>
        <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
          Управляйте предложениями, готовыми сценариями и календарём событий.
        </p>
      </section>
      <nav
        aria-label="Разделы страницы акций"
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
      {tab === "proposals" && (
        <AdminOffersProposalsForm items={content.data?.items} />
      )}
      {tab === "scenarios" && (
        <AdminOffersScenariosForm items={content.data?.items} />
      )}
      {tab === "events" && (
        <AdminOffersEventsForm items={content.data?.items} />
      )}
    </div>
  );
};
