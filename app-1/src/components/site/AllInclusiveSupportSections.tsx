import { ArrowRight } from "lucide-react";

import ctaImage from "@/assets/alsma/all-inclusive-cta.jpg";
import kidsImage from "@/assets/alsma/entertainment-kids.jpg";
import musicImage from "@/assets/alsma/entertainment-music.jpg";
import { ROUTES } from "@/route-constants";

const animationFormats = [
  {
    description:
      "Игры, интерактивы и лёгкие развлекательные программы в течение дня помогают провести время активно, весело и интересно всей семье.",
    image: kidsImage,
    title: "Дневная анимация для взрослых и детей",
  },
  {
    description:
      "По вечерам гостей ждут живая музыка, танцевальные программы и атмосфера праздника, которая делает отдых ярче и запоминается.",
    image: musicImage,
    title: "Вечерняя анимация",
  },
] as const;

export const AllInclusiveAnimationSection = () => (
  <section className="bg-panel py-24">
    <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold tracking-widest text-brand uppercase">
          Программа отдыха
        </p>
        <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
          Анимация для взрослых и детей
        </h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {animationFormats.map((format) => (
          <article
            className="overflow-hidden rounded-4xl bg-page"
            key={format.title}
          >
            <img
              alt={format.title}
              className="h-64 w-full object-cover"
              src={format.image}
            />
            <div className="p-8">
              <h3 className="font-heading text-3xl font-semibold">
                {format.title}
              </h3>
              <p className="mt-4 leading-7 text-muted-ui-foreground">
                {format.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export const AllInclusiveFinalSection = () => (
  <section className="px-5 py-24 sm:px-8">
    <div className="relative mx-auto max-w-[100rem] overflow-hidden rounded-4xl px-6 py-16 text-center text-brand-foreground sm:px-12 sm:py-20">
      <img
        alt="Отдых в АЛСМА"
        className="absolute inset-0 size-full object-cover"
        src={ctaImage}
      />
      <div className="absolute inset-0 bg-brand/80" />
      <div className="relative mx-auto max-w-4xl">
        <p className="text-sm font-semibold tracking-widest uppercase opacity-70">
          Почему это важно
        </p>
        <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
          «Всё включено» здесь — не формальность, а часть впечатления
        </h2>
        <p className="mt-6 text-lg leading-8 opacity-85">
          Питание в АЛСМЕ поддерживает общий сценарий отдыха: днём — понятная и
          вкусная кухня, в SPA — лёгкие и удобные перекусы, вечером — барная
          атмосфера или ужин в куполе.
        </p>
        <a
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 font-semibold"
          href={ROUTES.rooms}
        >
          Узнать подробнее <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  </section>
);
