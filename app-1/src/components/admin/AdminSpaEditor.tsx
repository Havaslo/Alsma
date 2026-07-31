import { useState } from "react";
import { Loader } from "@/components/ui/Loader";
import { cn } from "@/lib/cn";
import { useAdminSiteContent } from "@/lib/site/useSiteContent";
import { getSpaDefaults } from "@/lib/site/spa-content";
import { AdminSpaCollectionForm } from "@/components/admin/AdminSpaCollectionForm";

const tabs = [
  { id: "massages", label: "Массажные процедуры" },
  { id: "promotions", label: "Актуальные акции" },
  { id: "menu", label: "Меню кафе «Минерал»" },
  { id: "additional", label: "Дополнительные услуги" },
] as const;
type Tab = (typeof tabs)[number]["id"];

export const AdminSpaEditor = () => {
  const [tab, setTab] = useState<Tab>("massages");
  const content = useAdminSiteContent("spa");
  if (content.isLoading) return <div className="grid min-h-[60vh] place-items-center"><Loader className="text-brand" label="Загрузка редактора" size="lg" /></div>;
  const defaults = getSpaDefaults(content.data?.items);
  const common = { items: content.data?.items };
  return <div className="space-y-6"><section><p className="text-sm font-semibold tracking-wide text-muted-ui-foreground uppercase">Управление сайтом</p><h1 className="mt-2 text-3xl font-semibold text-brand">SPA</h1><p className="mt-2 text-sm leading-6 text-muted-ui-foreground">Настройте каждый блок страницы SPA в отдельном разделе.</p></section><nav aria-label="Разделы страницы SPA" className="scrollbar-none flex gap-7 overflow-x-auto border-b border-line">{tabs.map((item) => <button aria-current={tab === item.id ? "page" : undefined} className={cn("shrink-0 border-b-2 px-1 pb-4 text-sm font-semibold transition", tab === item.id ? "border-brand text-brand" : "border-transparent text-muted-ui-foreground hover:text-brand")} key={item.id} onClick={() => setTab(item.id)} type="button">{item.label}</button>)}</nav>{tab === "massages" && <AdminSpaCollectionForm {...common} defaults={defaults.massages} fields={[{ key: "name", label: "Процедура" }, { key: "duration", label: "Длительность" }, { key: "price", label: "Стоимость" }]} addItem={{ name: "", duration: "", price: "" }} addLabel="Добавить процедуру" layout="table" itemKey="massages" title="Массажные процедуры" description="Заполните строки таблицы с процедурами, длительностью и стоимостью." />}{tab === "promotions" && <AdminSpaCollectionForm {...common} defaults={defaults.promotions} fields={[{ key: "title", label: "Название" }, { key: "deadline", label: "Срок действия" }, { key: "price", label: "Стоимость" }, { key: "image", label: "URL изображения" }, { key: "description", label: "Описание", area: true }]} addItem={{ title: "", deadline: "", price: "", image: "", description: "" }} addLabel="Добавить акцию" itemKey="promotions" title="Актуальные акции" description="Управляйте карточками актуальных предложений SPA." />}{tab === "menu" && <AdminSpaCollectionForm {...common} defaults={defaults.menu} fields={[{ key: "name", label: "Позиция меню" }, { key: "description", label: "Описание" }, { key: "price", label: "Стоимость" }]} addItem={{ name: "", description: "", price: "" }} addLabel="Добавить позицию" itemKey="cafe-menu" title="Меню кафе «Минерал»" description="Добавляйте блюда, напитки и услуги кафе." />}{tab === "additional" && <AdminSpaCollectionForm {...common} defaults={defaults.additional} fields={[{ key: "service", label: "Услуга или тариф" }, { key: "price", label: "Стоимость" }]} addItem={{ service: "", price: "" }} addLabel="Добавить услугу" layout="table" itemKey="additional-services" title="Дополнительные услуги и посещение SPA" description="Заполните таблицу дополнительных услуг и тарифов посещения." />}</div>;
};
