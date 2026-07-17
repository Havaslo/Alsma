import { useState } from "react";

import { LoaderCircle, Send } from "lucide-react";

import { useCreateLead } from "@/lib/leads/useCreateLead";

export const TransferRequestForm = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [origin, setOrigin] = useState("");
  const [passengers, setPassengers] = useState("1");
  const lead = useCreateLead();

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        lead.mutate({
          comment: `Трансфер: ${origin}; дата: ${date}; время: ${time}; пассажиров: ${passengers}`,
          formCode: "about-transfer",
          formTitle: "Заявка на трансфер",
          name,
          phone,
          sourcePage: "about",
        });
      }}
    >
      <input
        className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none"
        onChange={(event) => setName(event.target.value)}
        placeholder="Имя"
        required
        value={name}
      />
      <input
        className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none"
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Телефон"
        required
        type="tel"
        value={phone}
      />
      <input
        className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none"
        onChange={(event) => setDate(event.target.value)}
        required
        type="date"
        value={date}
      />
      <input
        className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none"
        onChange={(event) => setTime(event.target.value)}
        required
        type="time"
        value={time}
      />
      <input
        className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none"
        onChange={(event) => setOrigin(event.target.value)}
        placeholder="Откуда забрать"
        required
        value={origin}
      />
      <input
        className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none"
        min="1"
        onChange={(event) => setPassengers(event.target.value)}
        type="number"
        value={passengers}
      />
      <button
        className="inline-flex items-center justify-center gap-2 rounded-full bg-panel px-7 py-4 font-semibold text-brand disabled:opacity-60 md:col-span-2"
        disabled={lead.isPending}
        type="submit"
      >
        {lead.isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}{" "}
        Заказать трансфер
      </button>
      {lead.isSuccess && (
        <p className="md:col-span-2">
          Заявка принята. Мы свяжемся с вами для подтверждения.
        </p>
      )}
    </form>
  );
};
