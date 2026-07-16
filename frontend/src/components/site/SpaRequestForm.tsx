import { useState } from "react";

import { LoaderCircle, Send } from "lucide-react";

import { useCreateLead } from "@/lib/leads/useCreateLead";

export const SpaRequestForm = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const lead = useCreateLead();

  return (
    <form
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        lead.mutate({
          formCode: "spa-request",
          formTitle: "Запись на SPA-процедуру",
          name,
          phone,
          sourcePage: "spa",
        });
      }}
    >
      <input
        className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none placeholder:text-brand-foreground/60 focus:border-brand-foreground"
        onChange={(event) => setName(event.target.value)}
        placeholder="Ваше имя"
        required
        value={name}
      />
      <input
        className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none placeholder:text-brand-foreground/60 focus:border-brand-foreground"
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Телефон"
        required
        type="tel"
        value={phone}
      />
      <button
        className="inline-flex items-center justify-center gap-2 rounded-full bg-panel px-7 py-4 font-semibold text-brand disabled:opacity-60"
        disabled={lead.isPending}
        type="submit"
      >
        {lead.isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Отправить
      </button>
      {lead.isSuccess && (
        <p className="sm:col-span-3">
          Заявка принята. Мы скоро свяжемся с вами.
        </p>
      )}
      {lead.isError && (
        <p className="sm:col-span-3">
          Не удалось отправить заявку. Попробуйте ещё раз.
        </p>
      )}
    </form>
  );
};
