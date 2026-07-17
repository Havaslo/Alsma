import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import natureImage from "@/assets/alsma/nature.jpg";
import spaImage from "@/assets/alsma/spa-programs.jpg";
import { LeadRequestForm } from "@/components/site/LeadRequestForm";

const discoveries = [
  {
    description:
      "Минеральная вода, термальная зона, массажи и авторские ритуалы для глубокого восстановления.",
    eyebrow: "SPA и wellness",
    href: AMAZI_ROUTES.spa,
    image: spaImage,
    title: "Пространство, где можно замедлиться",
  },
  {
    description:
      "Большая территория на слиянии двух рек, сосновый лес и команда, которая заботится о деталях отдыха.",
    eyebrow: "Об АЛСМА",
    href: AMAZI_ROUTES.about,
    image: natureImage,
    title: "Загородный отель в окружении природы",
  },
] as const;

export const HomeDiscoverySections = () => (
  <>
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-2">
        {discoveries.map((item) => (
          <article
            className="overflow-hidden rounded-4xl bg-panel"
            key={item.href}
          >
            <img
              alt={item.title}
              className="h-80 w-full object-cover"
              src={item.image}
            />
            <div className="p-8 sm:p-10">
              <p className="text-sm font-semibold tracking-widest text-brand uppercase">
                {item.eyebrow}
              </p>
              <h2 className="mt-4 font-heading text-4xl font-semibold">
                {item.title}
              </h2>
              <p className="mt-5 leading-7 text-muted-ui-foreground">
                {item.description}
              </p>
              <a
                className="mt-7 inline-flex items-center gap-2 font-semibold text-brand"
                href={item.href}
              >
                Узнать больше <ArrowRight className="size-4" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
    <section className="bg-brand py-20 text-brand-foreground" id="contacts">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-semibold tracking-widest uppercase opacity-70">
            Свяжитесь с нами
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Поможем спланировать отдых
          </h2>
          <p className="mt-5 max-w-2xl leading-7 text-brand-foreground/75">
            Расскажем о свободных номерах, программах SPA, трансфере и форматах
            отдыха для семьи или компании.
          </p>
        </div>
        <div className="grid gap-3">
          <a
            className="flex items-center gap-4 rounded-3xl bg-page p-5 font-semibold text-brand"
            href="tel:+79302838828"
          >
            <Phone className="size-5" /> +7 930 283-88-28
          </a>
          <a
            className="flex items-center gap-4 rounded-3xl bg-page p-5 font-semibold text-brand"
            href="mailto:info@alsma-baza.ru"
          >
            <Mail className="size-5" /> info@alsma-baza.ru
          </a>
          <div className="flex items-center gap-4 rounded-3xl bg-page p-5 text-page-foreground">
            <MapPin className="size-5 shrink-0 text-brand" /> Нижегородская
            область, Борский район
          </div>
        </div>
        <div className="border-t border-brand-foreground/20 pt-8 lg:col-span-2">
          <LeadRequestForm
            formCode="home-general"
            formTitle="Общая заявка с главной страницы"
            showDetails
            sourcePage="home"
          />
        </div>
      </div>
    </section>
  </>
);
