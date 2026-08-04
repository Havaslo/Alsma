import { useState } from "react";

import { AdminHomeBannersForm } from "@/components/admin/AdminHomeBannersForm";
import { AdminHomeHeroForm } from "@/components/admin/AdminHomeHeroForm";
import { AdminHomeReviewsForm } from "@/components/admin/AdminHomeReviewsForm";
import { Loader } from "@/components/ui/Loader";
import { cn } from "@/lib/cn";
import { useAdminSiteContent } from "@/lib/site/useSiteContent";

const tabs = [
  { id: "hero", label: "Hero" },
  { id: "reviews", label: "Отзывы" },
  { id: "popup-banners", label: "Рекламный баннер" },
] as const;

type HomeTab = (typeof tabs)[number]["id"];

export const AdminHomeEditor = () => {
  const [tab, setTab] = useState<HomeTab>("hero");
  const content = useAdminSiteContent("home");

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
        <h1 className="mt-2 text-3xl font-semibold text-brand">Главная</h1>
        <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
          Редактируйте ключевые блоки главной страницы. Сценарии отдыха
          управляются единообразно в разделе «Акции» → «Готовые сценарии».
        </p>
      </section>

      <nav
        aria-label="Разделы главной страницы"
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

      {tab === "hero" && <AdminHomeHeroForm items={content.data?.items} />}
      {tab === "reviews" && (
        <AdminHomeReviewsForm items={content.data?.items} />
      )}
      {tab === "popup-banners" && (
        <AdminHomeBannersForm items={content.data?.items} />
      )}
    </div>
  );
};
