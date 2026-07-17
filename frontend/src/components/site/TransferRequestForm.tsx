import { useState } from "react";

import { Send } from "lucide-react";

import { Loader } from "@/components/ui/Loader";
import { useCreateLead } from "@/lib/leads/useCreateLead";

const fieldClassName =
  "rounded-2xl border border-line bg-page px-5 py-4 text-page-foreground outline-none focus:border-focus";
const labelClassName =
  "grid gap-2 text-sm font-semibold text-muted-ui-foreground";

export const TransferRequestForm = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [origin, setOrigin] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [comment, setComment] = useState("");
  const lead = useCreateLead();

  return (
    <form
      className="mt-8 grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        lead.mutate({
          comment: `Трансфер: ${origin}; дата: ${date}; время: ${time}; пассажиров: ${passengers}. ${comment}`,
          formCode: "about-transfer",
          formTitle: "Заявка на трансфер",
          name,
          phone,
          sourcePage: "about",
        });
      }}
    >
      <label className={labelClassName}>
        Имя *
        <input
          className={fieldClassName}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ваше имя"
          required
          value={name}
        />
      </label>
      <label className={labelClassName}>
        Телефон *
        <input
          className={fieldClassName}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+7 (___) ___-__-__"
          required
          type="tel"
          value={phone}
        />
      </label>
      <label className={labelClassName}>
        Дата *
        <input
          className={fieldClassName}
          onChange={(event) => setDate(event.target.value)}
          required
          type="date"
          value={date}
        />
      </label>
      <label className={labelClassName}>
        Время *
        <input
          className={fieldClassName}
          onChange={(event) => setTime(event.target.value)}
          required
          type="time"
          value={time}
        />
      </label>
      <label className={labelClassName}>
        Откуда *
        <select
          className={fieldClassName}
          onChange={(event) => setOrigin(event.target.value)}
          required
          value={origin}
        >
          <option value="">Выберите место</option>
          <option value="Аэропорт Стригино">Аэропорт Стригино</option>
          <option value="Ж/д вокзал">Ж/д вокзал</option>
          <option value="Центр Нижнего Новгорода">
            Центр Нижнего Новгорода
          </option>
          <option value="Индивидуальный адрес">Индивидуальный адрес</option>
        </select>
      </label>
      <label className={labelClassName}>
        Количество пассажиров
        <select
          className={fieldClassName}
          onChange={(event) => setPassengers(event.target.value)}
          value={passengers}
        >
          <option value="1">1 человек</option>
          <option value="2">2 человека</option>
          <option value="3">3 человека</option>
          <option value="4">4+ человек</option>
        </select>
      </label>
      <label className={`${labelClassName} md:col-span-2`}>
        Комментарий
        <textarea
          className={`${fieldClassName} min-h-32`}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Например: нужен детский бустер, встреча у вокзала, поздний приезд"
          value={comment}
        />
      </label>
      <button
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-7 py-4 font-semibold text-brand-foreground disabled:opacity-60 md:col-span-2"
        disabled={lead.isPending}
        type="submit"
      >
        {lead.isPending ? <Loader size="sm" /> : <Send className="size-4" />}{" "}
        Заказать трансфер
      </button>
      {lead.isSuccess && (
        <p className="text-brand md:col-span-2">
          Заявка принята. Мы свяжемся с вами для подтверждения.
        </p>
      )}
    </form>
  );
};
