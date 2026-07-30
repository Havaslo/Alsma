import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
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
  ["adults", "Взрослый", ""] as const,
  ["children", "Ребенок", "2–12 лет"] as const,
  ["infants", "Младенец", "0–2 года"] as const,
];

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
  const recommendedRooms = [...rooms]
    .map((room, index) => {
      const roomText =
        `${room.title} ${room.description} ${room.amenities.join(" ")}`.toLocaleLowerCase(
          "ru",
        );
      const capacity = Math.max(
        ...(room.capacity.match(/\d+/g)?.map(Number) ?? [0]),
      );
      const area = Number(room.area.match(/\d+/)?.[0] ?? 0);
      let score = rooms.length - index;

      if (capacity >= totalGuests) score += 3;
      if (totalGuests > capacity) score -= 4;
      if (answers[1] === "family" && capacity >= 4) score += 2;
      if (answers[1] === "spa" && roomText.includes("spa")) score += 2;
      if (answers[2] === "view" && /вид|панорам|лес/.test(roomText)) score += 3;
      if (answers[2] === "panorama" && /панорам|вид|лес/.test(roomText))
        score += 3;
      if (answers[2] === "privacy" && /отдельн|уедин|приват/.test(roomText))
        score += 3;
      if (answers[2] === "space" && area >= 40) score += 3;

      return { index, room, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 3)
    .map(({ room }) => room);

  const reset = () => {
    setStep(0);
    setGuests({ adults: "2", children: "1", infants: "1" });
    setAnswers(["", "romantic", "privacy"]);
    setShowResult(false);
  };

  const updateGuestCount = (field: keyof GuestCounts, value: string) => {
    setGuests((current) => ({
      ...current,
      [field]: value.replace(/\D/g, "").slice(0, 2),
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
              className="min-h-11 rounded-2xl bg-brand px-8 py-3 font-semibold text-brand-foreground"
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
      {showResult && recommendedRooms.length > 0 ? (
        <div className="py-3">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Подходящие варианты
          </p>
          <h3 className="mt-4 font-heading text-4xl font-semibold">
            Мы подобрали номера для вашего отдыха
          </h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedRooms.map((room) => (
              <a
                className="group block overflow-hidden rounded-3xl border border-line bg-page transition hover:-translate-y-1 hover:border-brand focus-visible:ring-4 focus-visible:ring-focus/20 focus-visible:outline-none"
                href={`${ROUTES.home}#booking`}
                key={room.title}
              >
                <img
                  alt={room.title}
                  className="h-40 w-full object-cover"
                  src={room.image}
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
                </div>
              </a>
            ))}
          </div>
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
                    min="0"
                    onChange={(event) =>
                      updateGuestCount(field, event.target.value)
                    }
                    type="number"
                    value={guests[field]}
                  />
                </label>
              ))}
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
