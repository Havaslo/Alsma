import { useState } from "react";

import { Sparkles } from "lucide-react";

import { RoomRecommendationQuiz } from "@/components/site/RoomRecommendationQuiz";
import type { RoomCategory } from "@/lib/site/rooms";

export const RoomsSupportSections = ({
  rooms,
}: {
  readonly rooms: readonly RoomCategory[];
}) => {
  const [quizOpen, setQuizOpen] = useState(false);

  return (
    <>
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid gap-8 rounded-4xl bg-panel p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Форматы размещения
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Индивидуальные и групповые корпуса
            </h2>
            <p className="mt-5 leading-7 text-muted-ui-foreground">
              Подберём приватный вариант для тихого отдыха или разместим семью,
              дружескую компанию и организованный заезд рядом.
            </p>
          </div>
          <div className="grid gap-4">
            <article className="rounded-3xl bg-page p-6">
              <h3 className="text-xl font-semibold">Индивидуальные корпуса</h3>
              <p className="mt-3 text-muted-ui-foreground">
                Отдельный вход и максимум личного пространства.
              </p>
            </article>
            <article className="rounded-3xl bg-page p-6">
              <h3 className="text-xl font-semibold">Групповые корпуса</h3>
              <p className="mt-3 text-muted-ui-foreground">
                Размещение рядом для общего сценария поездки.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-page px-5 py-20 text-brand-foreground sm:px-8">
        <div className="mx-auto max-w-7xl rounded-4xl bg-brand px-8 py-10 shadow-xl sm:px-12 sm:py-12">
          <p className="text-sm font-semibold tracking-widest uppercase opacity-70">
            AI-рекомендатор
          </p>
          <div className="mt-4 flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
                Какой номер подходит именно вам?
              </h2>
              <p className="mt-5 max-w-2xl text-brand-foreground/75">
                Учтём количество гостей и главный приоритет отдыха, затем
                предложим подходящую категорию.
              </p>
            </div>
            <button
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-panel px-7 py-4 font-semibold text-brand"
              onClick={() => {
                setQuizOpen(true);
              }}
              type="button"
            >
              <Sparkles className="size-5" /> Подобрать номер
            </button>
          </div>
        </div>
      </section>

      <RoomRecommendationQuiz
        onClose={() => setQuizOpen(false)}
        open={quizOpen}
        rooms={rooms}
      />
    </>
  );
};
