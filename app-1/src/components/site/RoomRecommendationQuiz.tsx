import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import type { RoomCategory } from "@/lib/site/rooms";

const questions = [
  {
    description:
      "Это поможет сразу исключить слишком маленькие или слишком большие варианты.",
    options: [
      [
        "2",
        "1–2 гостя",
        "Для уединенного отдыха, романтической поездки или SPA-выходных.",
      ],
      ["4", "3–4 гостя", "Подходит для семьи или небольшой компании."],
      [
        "6",
        "5–6 гостей",
        "Если важно разместиться всем вместе и сохранить приватность.",
      ],
    ],
    title: "Сколько гостей планирует поездку?",
  },
  {
    description:
      "Выберите вариант, который лучше всего описывает вашу компанию.",
    options: [
      ["kids", "Есть дети", "Нужнее простор, удобный быт и спокойный режим."],
      [
        "teens",
        "Подростки",
        "Важен баланс между активностью и личным пространством.",
      ],
      [
        "adults",
        "Только взрослые",
        "Можно сместить акцент на приватность, вид и SPA.",
      ],
    ],
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
    description: "Главный приоритет повлияет на итоговую рекомендацию.",
    options: [
      [
        "view",
        "Панорамный вид",
        "Больше света, воздуха и красивой перспективы.",
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
  const [answers, setAnswers] = useState([
    "2",
    "adults",
    "romantic",
    "privacy",
  ]);
  const [showResult, setShowResult] = useState(false);
  const question = questions[step];
  const recommendedRooms = [...rooms]
    .map((room, index) => {
      const roomText =
        `${room.title} ${room.description} ${room.amenities.join(" ")}`.toLocaleLowerCase(
          "ru",
        );
      const capacity = Number(room.capacity.match(/\d+/g)?.at(-1) ?? 0);
      const area = Number(room.area.match(/\d+/)?.[0] ?? 0);
      let score = rooms.length - index;

      if (capacity >= Number(answers[0])) score += 3;
      if (answers[2] === "family" && capacity >= 4) score += 2;
      if (answers[2] === "spa" && roomText.includes("spa")) score += 2;
      if (answers[3] === "view" && /вид|панорам|лес/.test(roomText)) score += 3;
      if (answers[3] === "privacy" && /отдельн|уедин|приват/.test(roomText))
        score += 3;
      if (answers[3] === "space" && area >= 40) score += 3;

      return { index, room, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 3)
    .map(({ room }) => room);

  const reset = () => {
    setStep(0);
    setShowResult(false);
  };

  return (
    <Modal
      className="max-w-4xl rounded-4xl"
      closeLabel="Закрыть подбор номера"
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
              <article
                className="overflow-hidden rounded-3xl border border-line bg-page"
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
              </article>
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
          <div className="mb-8 grid grid-cols-4 gap-3">
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
          <p className="mt-4 text-muted-ui-foreground">
            {question.description}
          </p>
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
          <div className="mt-7 flex items-center justify-between border-t border-line pt-5">
            {step > 0 ? (
              <button
                className="rounded-2xl border border-line px-6 py-4 font-semibold"
                onClick={() => setStep((current) => current - 1)}
                type="button"
              >
                Назад
              </button>
            ) : (
              <span />
            )}
            <button
              className="rounded-2xl bg-brand px-8 py-4 font-semibold text-brand-foreground"
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
        </div>
      )}
    </Modal>
  );
};
