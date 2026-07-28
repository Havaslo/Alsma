import { useForm } from "react-hook-form";

import { Send } from "lucide-react";

import { Form } from "@/components/Form";
import { Loader } from "@/components/ui/Loader";
import { useCreateLead } from "@/lib/leads/useCreateLead";

const fieldClassName =
  "rounded-2xl border border-line bg-page px-5 py-4 text-page-foreground outline-none focus:border-focus";
const labelClassName =
  "grid gap-2 text-sm font-semibold text-muted-ui-foreground";

type TransferFormValues = {
  comment: string;
  date: string;
  name: string;
  origin: string;
  passengers: string;
  phone: string;
  time: string;
};

export const TransferRequestForm = () => {
  const lead = useCreateLead();
  const form = useForm<TransferFormValues>({
    defaultValues: {
      comment: "",
      date: "",
      name: "",
      origin: "",
      passengers: "1",
      phone: "",
      time: "",
    },
  });

  return (
    <Form
      className="mt-8 grid gap-4 md:grid-cols-2"
      form={form}
      onSubmit={(values) => {
        lead.mutate({
          comment: `Трансфер: ${values.origin}; дата: ${values.date}; время: ${values.time}; пассажиров: ${values.passengers}. ${values.comment}`,
          formCode: "about-transfer",
          formTitle: "Заявка на трансфер",
          name: values.name,
          phone: values.phone,
          sourcePage: "about",
        });
      }}
    >
      <label className={labelClassName}>
        Имя *
        <input
          className={fieldClassName}
          placeholder="Ваше имя"
          {...form.register("name", { required: true })}
        />
      </label>
      <label className={labelClassName}>
        Телефон *
        <input
          className={fieldClassName}
          placeholder="+7 (___) ___-__-__"
          type="tel"
          {...form.register("phone", { required: true })}
        />
      </label>
      <label className={labelClassName}>
        Дата *
        <input
          className={fieldClassName}
          type="date"
          {...form.register("date", { required: true })}
        />
      </label>
      <label className={labelClassName}>
        Время *
        <input
          className={fieldClassName}
          type="time"
          {...form.register("time", { required: true })}
        />
      </label>
      <label className={labelClassName}>
        Откуда *
        <select
          className={fieldClassName}
          {...form.register("origin", { required: true })}
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
        <select className={fieldClassName} {...form.register("passengers")}>
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
          placeholder="Например: нужен детский бустер, встреча у вокзала, поздний приезд"
          {...form.register("comment")}
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
    </Form>
  );
};
