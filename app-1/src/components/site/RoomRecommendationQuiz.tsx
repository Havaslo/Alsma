import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { resolveMediaUrl } from "@/lib/site/media-url";
import { getRecommendedRooms } from "@/lib/site/room-recommendations";
import type { RoomCategory } from "@/lib/site/rooms";
import { ROUTES } from "@/route-constants";

type GuestCounts = {
  readonly adults: string;
  readonly children: string;
  readonly infants: string;
};

const questions = [
  {
    description: "",
    options: [],
    title: "Кто едет с вами?",
  },
  {
    description: "Выберите сценарий, вокруг которого строится поездка.",
    options: [
      [
        "romantic",
        "Романтический отдых",
        "Больше атмосферы, приватности и красивых видов.",
      ],
      [
        "family",
        "Семейная поездка",
        "Комфортное размещение для всех и больше пространства.",
      ],
      [
        "spa",
        "SPA и восстановление",
        "Хочется быть ближе к процедурам и расслабляющей атмосфере.",
      ],
      [
        "quiet",
        "Тишина и перезагрузка",
        "Нужен спокойный ритм и ощущение уединения.",
      ],
    ],
    title: "Какой формат отдыха вы хотите?",
  },
  {
    description:
      "Можно выбрать до трех приоритетов — это повлияет на итоговую подборку.",
    options: [
      [
        "view",
        "Вид на реку",
        "Для более выразительных видов и атмосферы загородного ретрита.",
      ],
      [
        "panorama",
        "Панорамный вид",
        "Если хочется больше света, воздуха и красивой перспективы.",
      ],
      [
        "spa",
        "Близость к SPA",
        "Чтобы процедуры и восстановление были под рукой.",
      ],
      [
        "privacy",
        "Максимум приватности",
        "Для тихого отдыха без лишнего шума вокруг.",
      ],
      [
        "space",
        "Больше пространства",
        "Особенно важно для семьи или компании.",
      ],
    ],
    title: "Что для вас особенно важно?",
  },
] as const;

const guestFields = [
  ["adults", "Взрослые", ""] as const,
  ["children", "Дети", "2–12 лет"] as const,
  ["infants", "Младенцы", "0–2 года"] as const,
];
const guestCountLimits: Record<keyof GuestCounts, number> = {
  adults: 12,
  children: 8,
  infants: 8,
};

export const RoomRecommendationQuiz = ({
  onClose,
  open,
  rooms,
}: {
  onClose: () => void;
  open: boolean;
  rooms: readonly RoomCategory[];
}) => {
  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState<GuestCounts>({
    adults: "2",
    children: "1",
    infants: "1",
  });
  const [answers, setAnswers] = useState(["", "romantic", "privacy"]);
  const [showResult, setShowResult] = useState(false);
  const question = questions[step];
  const totalGuests = Object.values(guests).reduce(
    (total, count) => total + Number(count || 0),
    0,
  );
  const adultCount = Number(guests.adults || 0);
  const childCount = Number(guests.children || 0);
  const infantCount = Number(guests.infants || 0);
  const minorCount = childCount + infantCount;
  const isGuestSelectionValid =
    adultCount >= 1 && adultCount <= 12 && minorCount <= 8 && totalGuests <= 20;
  const recommendedRooms = isGuestSelectionValid
    ? getRecommendedRooms(rooms, totalGuests, adultCount, answers)
    : [];
  const bookingHref = (roomCount: 1 | 2) => {
    const search = new URLSearchParams({
      adults: String(adultCount),
      children: String(minorCount),
      roomCount: String(roomCount),
    });
    return `${ROUTES.booking}?${search.toString()}`;
  };

  const reset = () => {
    setStep(0);
    setGuests({ adults: "2", children: "1", infants: "1" });
    setAnswers(["", "romantic", "privacy"]);
    setShowResult(false);
  };

  const updateGuestCount = (field: keyof GuestCounts, value: string) => {
    const nextCount = Number(value.replace(/\D/g, "").slice(0, 2) || 0);
    setGuests((current) => ({
      ...current,
      [field]: String(Math.min(guestCountLimits[field], nextCount)),
    }));
  };

  return (
    <Modal
      className="max-w-4xl rounded-4xl"
      closeLabel="Закрыть подбор номера"
      footer={
        !showResult && (
          <div className="flex w-full items-center justify-between gap-3">
            {step > 0 ? (
              <button
                className="min-h-11 rounded-2xl border border-line px-6 py-3 font-semibold"
                onClick={() => setStep((current) => current - 1)}
                type="button"
              >
                Назад
              </button>
            ) : (
              <span />
            )}
            <button
              className="min-h-11 rounded-2xl bg-brand px-8 py-3 font-semibold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={step === 0 && !isGuestSelectionValid}
              onClick={() =>
                step === questions.length - 1
                  ? setShowResult(true)
                  : setStep((current) => current + 1)
              }
              type="button"
            >
              {step === questions.length - 1 ? "Показать номера" : "Дальше"}
            </button>
          </div>
        )
      }
      onClose={onClose}
      open={open}
      title="Подбор идеального номера"
    >
      {showResult && isGuestSelectionValid ? (
        <div className="py-3">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Подходящие варианты
          </p>
          <h3 className="mt-4 font-heading text-4xl font-semibold">
            {recommendedRooms.length
              ? `Варианты для ${totalGuests} ${totalGuests === 1 ? "гостя" : "гостей"}`
              : "Не нашли подходящий вариант"}
          </h3>
          {recommendedRooms.length ? (
            <>
              <p className="mt-3 text-muted-ui-foreground">
                Состав гостей и количество номеров перенесены. На экране
                бронирования проверьте даты, добавьте даты рождения детей и
                выберите тарифы.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendedRooms.map(({ capacity, room, roomCount }) => (
                  <a
                    className="group block overflow-hidden rounded-3xl border border-line bg-page transition hover:-translate-y-1 hover:border-brand focus-visible:ring-4 focus-visible:ring-focus/20 focus-visible:outline-none"
                    href={bookingHref(roomCount)}
                    key={room.title}
                  >
                    <img
                      alt={room.title}
                      className="h-40 w-full object-cover"
                      src={resolveMediaUrl(room.image)}
                    />
                    <div className="p-5">
                      <h4 className="font-heading text-2xl font-semibold">
                        {room.title}
                      </h4>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-ui-foreground">
                        {room.description}
                      </p>
                      <p className="mt-4 font-semibold text-brand">
                        {room.price} / ночь
                      </p>
                      <p className="mt-2 text-sm font-medium text-brand">
                        {roomCount === 1
                          ? `1 номер · вместимость до ${capacity} гостей`
                          : `Нужно 2 номера · до ${capacity} гостей в каждом`}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-line bg-page p-5">
              <p className="leading-7 text-muted-ui-foreground">
                В каталоге не нашлось номера или пары номеров подходящей
                вместимости для выбранного состава гостей. Можно продолжить на
                экран бронирования и посмотреть доступные варианты вручную.
              </p>
              <a
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground"
                href={bookingHref(adultCount >= 2 ? 2 : 1)}
              >
                Перейти к бронированию
              </a>
            </div>
          )}
          <button
            className="mt-8 rounded-2xl border border-line px-6 py-4 font-semibold"
            onClick={reset}
            type="button"
          >
            Пройти заново
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-8 grid grid-cols-3 gap-3">
            {questions.map((item, index) => (
              <span
                className={cn(
                  "h-1.5 rounded-full bg-muted-ui",
                  index <= step && "bg-brand",
                )}
                key={item.title}
              />
            ))}
          </div>
          <p className="text-muted-ui-foreground">
            Вопрос {step + 1} из {questions.length}
          </p>
          <h3 className="mt-5 font-heading text-3xl font-semibold">
            {question.title}
          </h3>
          {question.description && (
            <p className="mt-4 text-muted-ui-foreground">
              {question.description}
            </p>
          )}
          {step === 0 ? (
            <div className="mt-6 space-y-4">
              {guestFields.map(([field, label, hint]) => (
                <label
                  className="flex min-h-28 items-center justify-between gap-5 rounded-2xl border border-line bg-page px-5 py-4 shadow-sm shadow-page-foreground/5"
                  key={field}
                >
                  <span>
                    <strong className="block text-lg">{label}</strong>
                    {hint && (
                      <span className="mt-1 block text-sm text-muted-ui-foreground">
                        {hint}
                      </span>
                    )}
                  </span>
                  <input
                    aria-label={`Количество: ${label.toLocaleLowerCase("ru")}`}
                    className="h-16 w-28 rounded-full border border-line bg-page px-4 text-center text-lg transition outline-none focus:border-brand focus:ring-4 focus:ring-focus/20"
                    inputMode="numeric"
                    max={guestCountLimits[field]}
                    min="0"
                    onChange={(event) =>
                      updateGuestCount(field, event.target.value)
                    }
                    type="number"
                    value={guests[field]}
                  />
                </label>
              ))}
              {!isGuestSelectionValid && (
                <p className="text-sm text-destructive" role="status">
                  Укажите не менее одного взрослого. Для бронирования можно
                  выбрать до 12 взрослых и до 8 детей и младенцев вместе.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {question.options.map(([value, label, description]) => (
                <button
                  className={cn(
                    "block w-full rounded-2xl border bg-page px-6 py-5 text-left transition",
                    answers[step] === value
                      ? "border-brand bg-brand/5"
                      : "border-line hover:border-brand/40",
                  )}
                  key={value}
                  onClick={() =>
                    setAnswers((current) =>
                      current.map((answer, index) =>
                        index === step ? value : answer,
                      ),
                    )
                  }
                  type="button"
                >
                  <strong className="block text-lg">{label}</strong>
                  <span className="mt-2 block text-sm text-muted-ui-foreground">
                    {description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
