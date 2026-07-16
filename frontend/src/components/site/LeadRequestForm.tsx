import { useState } from "react";

import { LoaderCircle, Send } from "lucide-react";

import { useCreateLead } from "@/lib/leads/useCreateLead";

type LeadRequestFormProps = {
  readonly formCode: string;
  readonly formTitle: string;
  readonly showDetails?: boolean;
  readonly sourcePage: string;
  readonly successMessage?: string;
};

export const LeadRequestForm = ({
  formCode,
  formTitle,
  showDetails = false,
  sourcePage,
  successMessage = "Заявка принята. Мы скоро свяжемся с вами.",
}: LeadRequestFormProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const lead = useCreateLead();

  return (
    <form
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        lead.mutate({
          comment: comment || undefined,
          email: email || undefined,
          formCode,
          formTitle,
          name,
          phone,
          sourcePage,
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
      {showDetails && (
        <>
          <input
            className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none placeholder:text-brand-foreground/60 focus:border-brand-foreground sm:col-span-2"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Электронная почта"
            required
            type="email"
            value={email}
          />
          <textarea
            className="min-h-28 rounded-3xl border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none placeholder:text-brand-foreground/60 focus:border-brand-foreground sm:col-span-3"
            onChange={(event) => setComment(event.target.value)}
            placeholder="Расскажите о формате и количестве гостей"
            value={comment}
          />
        </>
      )}
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
      {lead.isSuccess && <p className="sm:col-span-3">{successMessage}</p>}
      {lead.isError && (
        <p className="sm:col-span-3">
          Не удалось отправить заявку. Попробуйте ещё раз.
        </p>
      )}
    </form>
  );
};
