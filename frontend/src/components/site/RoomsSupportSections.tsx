import { useState } from "react";

import { Sparkles } from "lucide-react";

import { LeadRequestForm } from "@/components/site/LeadRequestForm";
import { Modal } from "@/components/ui/Modal";
import type { RoomCategory } from "@/lib/site/rooms";

const getRecommendation = (
  rooms: readonly RoomCategory[],
  guests: number,
  priority: string,
) => {
  if (priority === "space" || guests >= 4) return rooms.at(-1);
  if (priority === "view" || guests === 3) return rooms[1] ?? rooms[0];
  return rooms[0];
};

export const RoomsSupportSections = ({
  rooms,
}: {
  readonly rooms: readonly RoomCategory[];
}) => {
  const [quizOpen, setQuizOpen] = useState(false);
  const [guests, setGuests] = useState(2);
  const [priority, setPriority] = useState("quiet");
  const [submitted, setSubmitted] = useState(false);
  const recommendation = getRecommendation(rooms, guests, priority);

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

      <section className="bg-brand py-20 text-brand-foreground">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
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
                setSubmitted(false);
                setQuizOpen(true);
              }}
              type="button"
            >
              <Sparkles className="size-5" /> Подобрать номер
            </button>
          </div>
          <div className="mt-10 border-t border-brand-foreground/20 pt-8">
            <LeadRequestForm
              formCode="rooms-corpuses"
              formTitle="Заявка на размещение по корпусам"
              showDetails
              sourcePage="rooms"
            />
          </div>
        </div>
      </section>

      <Modal
        closeLabel="Закрыть подбор номера"
        onClose={() => setQuizOpen(false)}
        open={quizOpen}
        title="Подбор идеального номера"
      >
        {submitted && recommendation ? (
          <div className="py-4">
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Рекомендуем
            </p>
            <h3 className="mt-3 font-heading text-4xl font-semibold">
              {recommendation.title}
            </h3>
            <p className="mt-4 leading-7 text-muted-ui-foreground">
              {recommendation.description}
            </p>
            <p className="mt-6 text-xl font-semibold text-brand">
              {recommendation.price} / ночь
            </p>
          </div>
        ) : (
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(true);
            }}
          >
            <label className="font-medium">
              Количество гостей
              <select
                className="mt-2 block w-full rounded-2xl border border-line bg-page px-4 py-3"
                onChange={(event) => setGuests(Number(event.target.value))}
                value={guests}
              >
                <option value={1}>1 гость</option>
                <option value={2}>2 гостя</option>
                <option value={3}>3 гостя</option>
                <option value={4}>4 и более гостей</option>
              </select>
            </label>
            <label className="font-medium">
              Что важнее всего?
              <select
                className="mt-2 block w-full rounded-2xl border border-line bg-page px-4 py-3"
                onChange={(event) => setPriority(event.target.value)}
                value={priority}
              >
                <option value="quiet">Тишина и уют</option>
                <option value="view">Вид и зона отдыха</option>
                <option value="space">Максимум пространства</option>
              </select>
            </label>
            <button
              className="rounded-full bg-brand px-6 py-4 font-semibold text-brand-foreground"
              type="submit"
            >
              Получить рекомендацию
            </button>
          </form>
        )}
      </Modal>
    </>
  );
};
