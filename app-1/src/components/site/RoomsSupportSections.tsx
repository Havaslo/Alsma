import { useState } from "react";
import { useForm } from "react-hook-form";

import { Sparkles } from "lucide-react";

import { Form } from "@/components/Form";
import { RoomRecommendationQuiz } from "@/components/site/RoomRecommendationQuiz";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { useCreateLead } from "@/lib/leads/useCreateLead";
import type { RoomCategory } from "@/lib/site/rooms";

export const RoomsSupportSections = ({
  rooms,
}: {
  readonly rooms: readonly RoomCategory[];
}) => {
  const [quizOpen, setQuizOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  return (
    <>
      <section className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8">
        <div className="grid gap-8 rounded-4xl bg-panel p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Форматы размещения
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Индивидуальные и групповые корпуса для разных сценариев отдыха
            </h2>
            <p className="mt-5 leading-7 text-muted-ui-foreground">
              Если вам важны тишина, приватность и спокойный ритм, подойдут
              индивидуальные корпуса. Для семейных поездок, ретритов и заездов
              компанией удобнее групповые корпуса с возможностью разместиться
              рядом.
            </p>
            <button
              className="mt-8 rounded-full bg-brand px-8 py-4 font-semibold text-brand-foreground"
              onClick={() => setRequestOpen(true)}
              type="button"
            >
              Оставить заявку
            </button>
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
        <div className="mx-auto max-w-[100rem] rounded-4xl bg-brand px-8 py-10 shadow-xl sm:px-12 sm:py-12">
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
      <PlacementRequestModal
        onClose={() => setRequestOpen(false)}
        open={requestOpen}
      />
    </>
  );
};

type PlacementRequestValues = {
  comment: string;
  email: string;
  phone: string;
};

const PlacementRequestModal = ({
  onClose,
  open,
}: {
  readonly onClose: () => void;
  readonly open: boolean;
}) => {
  const lead = useCreateLead();
  const form = useForm<PlacementRequestValues>({
    defaultValues: { comment: "", email: "", phone: "" },
  });
  const inputClassName =
    "min-h-16 w-full rounded-2xl border border-booking-line/10 bg-booking-control px-5 py-4 text-lg text-page-foreground shadow-sm shadow-page-foreground/5 outline-none placeholder:text-muted-ui-foreground focus:border-booking-line/30 focus:ring-4 focus:ring-focus/10";

  return (
    <Modal
      className="max-w-4xl rounded-4xl bg-booking-shell"
      closeLabel="Закрыть форму заявки"
      headerClassName="items-start px-6 py-8 sm:px-10 sm:py-9"
      headerContent={
        <>
          <p className="text-sm font-semibold tracking-wide text-brand/60">
            Заявка на размещение
          </p>
          <h2 className="mt-4 max-w-2xl font-heading text-3xl leading-[1.08] font-semibold sm:text-5xl">
            Индивидуальные и групповые корпуса
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-ui-foreground">
            Оставьте контакты, и мы свяжемся с вами, чтобы подобрать подходящий
            вариант размещения.
          </p>
        </>
      }
      onClose={onClose}
      open={open}
      title="Индивидуальные и групповые корпуса"
    >
      <Form
        className="space-y-6"
        form={form}
        onSubmit={(values) => {
          lead.mutate(
            {
              comment: values.comment || undefined,
              email: values.email,
              formCode: "rooms-corpuses",
              formTitle: "Заявка на размещение по корпусам",
              phone: values.phone,
              sourcePage: "rooms",
            },
            { onSuccess: () => form.reset() },
          );
        }}
      >
        <label className="block text-sm font-medium">
          <span className="mb-3 block text-lg">Номер</span>
          <input
            className={inputClassName}
            placeholder="+7 (___) ___-__-__"
            type="tel"
            {...form.register("phone", { required: true })}
          />
        </label>
        <label className="block text-sm font-medium">
          <span className="mb-3 block text-lg">Почта</span>
          <input
            className={inputClassName}
            placeholder="you@example.com"
            type="email"
            {...form.register("email", { required: true })}
          />
        </label>
        <label className="block text-sm font-medium">
          <span className="mb-3 block text-lg">Комментарий</span>
          <textarea
            className="min-h-36 w-full resize-y rounded-2xl border border-booking-line/10 bg-booking-control px-5 py-4 text-lg text-page-foreground shadow-sm shadow-page-foreground/5 outline-none placeholder:text-muted-ui-foreground focus:border-booking-line/30 focus:ring-4 focus:ring-focus/10"
            placeholder="Расскажите, какой формат размещения вас интересует"
            {...form.register("comment")}
          />
        </label>
        <button
          className="inline-flex min-h-16 w-full items-center justify-center rounded-full bg-brand px-7 py-4 text-lg font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={lead.isPending}
          type="submit"
        >
          {lead.isPending && <Loader size="sm" />}
          Отправить заявку
        </button>
        {lead.isSuccess && (
          <p className="text-center text-brand">
            Заявка принята. Мы скоро свяжемся с вами.
          </p>
        )}
        {lead.isError && (
          <p className="text-center text-destructive">
            Не удалось отправить заявку. Попробуйте ещё раз.
          </p>
        )}
      </Form>
    </Modal>
  );
};
