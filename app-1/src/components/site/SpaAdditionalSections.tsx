import { useState } from "react";

import { AlertCircle } from "lucide-react";

import cafeImage from "@/assets/alsma/cafe-mineral-food.webp";
import type { SpaRequestOpenHandler } from "@/components/site/SpaRequestModal";
import { Modal } from "@/components/ui/Modal";
import { resolveMediaUrl } from "@/lib/site/media-url";
import type {
  SpaAdditionalService,
  SpaMenuItem,
  SpaPromotion,
} from "@/lib/site/spa-content";

const contraindications = [
  "Онкология любого типа",
  "Температура, грипп, острые вирусные инфекции",
  "Тромбоз, тромбофлебит",
  "Свежие переломы, открытые раны",
  "Кожные заболевания в стадии воспаления",
  "Беременность: процедуры возможны после 12-й недели, с осторожностью, по согласованию с мастером.",
] as const;

export const SpaPromotionsSection = ({
  items,
  onOpenRequest,
}: {
  readonly items: readonly SpaPromotion[];
  readonly onOpenRequest: SpaRequestOpenHandler;
}) => (
  <section className="py-8 sm:py-12 lg:py-12">
    <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
      <h2 className="text-center font-heading text-4xl font-semibold">
        Актуальные акции
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-muted-ui-foreground">
        Специальные предложения для отдыха, восстановления и заботы о себе.
      </p>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <article
            className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-page"
            key={item.title}
          >
            <img
              alt={item.title}
              className="h-60 w-full object-cover"
              src={resolveMediaUrl(item.image)}
            />
            <div className="flex min-h-80 flex-1 flex-col p-7">
              <h3 className="font-heading text-3xl font-semibold">
                {item.title}
              </h3>
              <p className="mt-4 text-muted-ui-foreground">
                {item.description}
              </p>
              <p className="mt-5 text-sm text-brand">{item.deadline}</p>
              <p className="mt-2 text-2xl font-semibold">{item.price}</p>
              <div className="mt-auto pt-8">
                <button
                  className="w-full rounded-full bg-brand px-6 py-3.5 font-semibold text-brand-foreground"
                  onClick={onOpenRequest}
                  type="button"
                >
                  Забронировать
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export const SpaInformationSections = ({
  additionalServices,
  menu,
}: {
  readonly additionalServices: readonly SpaAdditionalService[];
  readonly menu: readonly SpaMenuItem[];
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <section className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8 sm:py-12 lg:py-12">
        <article className="overflow-hidden rounded-4xl bg-panel lg:grid lg:grid-cols-2">
          <img
            alt="Кафе Минерал"
            className="aspect-[4/3] size-full object-cover lg:aspect-auto"
            src={cafeImage}
          />
          <div className="flex flex-col justify-center p-8 sm:p-12">
            <p className="text-sm font-semibold text-brand">
              Кафе при SPA-комплексе
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold">
              Кафе «Минерал»
            </h2>
            <p className="mt-3 text-muted-ui-foreground">
              Лёгкое меню и напитки, которые дополнят вашу SPA-программу.
            </p>
            <p className="mt-5 text-muted-ui-foreground">
              Уютное кафе при SPA-комплексе с полезным меню, свежевыжатыми
              соками и лёгкими закусками.
            </p>
            <button
              className="mt-8 w-fit rounded-full bg-brand px-7 py-4 font-semibold text-brand-foreground"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              Меню
            </button>
          </div>
        </article>
      </section>
      {additionalServices.length > 0 && (
        <section className="px-5 py-8 sm:px-8 sm:py-12 lg:py-12">
          <div className="mx-auto max-w-[100rem]">
            <h2 className="text-center font-heading text-4xl font-semibold">
              Дополнительные услуги в SPA
            </h2>
            <div className="mt-8 grid gap-6 sm:mt-12 lg:grid-cols-3">
              {additionalServices.map((item) => (
                <article
                  className="flex flex-col rounded-3xl bg-panel p-7"
                  key={item.service}
                >
                  <h3 className="font-heading text-2xl font-semibold text-brand">
                    {item.service}
                  </h3>
                  {item.description && (
                    <p className="mt-4 text-muted-ui-foreground">
                      {item.description}
                    </p>
                  )}
                  {item.duration && (
                    <p className="mt-auto pt-6 text-sm text-muted-ui-foreground">
                      Длительность: {item.duration}
                    </p>
                  )}
                  <p className="mt-3 text-2xl font-semibold">{item.price}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="bg-panel py-8 sm:py-12 lg:py-12">
        <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
          <h2 className="text-center font-heading text-4xl font-semibold">
            Общие противопоказания
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-ui-foreground">
            Ко всем процедурам, если не указано иное:
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {contraindications.map((item) => (
              <li className="flex gap-3 rounded-3xl bg-page p-6" key={item}>
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-brand" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Modal
        closeLabel="Закрыть"
        onClose={() => setMenuOpen(false)}
        open={menuOpen}
        title="Меню кафе «Минерал»"
      >
        <div className="space-y-3">
          {menu.map((item) => (
            <div className="rounded-2xl bg-page px-5 py-4" key={item.name}>
              <div className="flex items-start justify-between gap-4">
                <strong>{item.name}</strong>
                <span className="shrink-0 font-semibold text-brand">
                  {item.price}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-ui-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};
