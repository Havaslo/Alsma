import { useForm } from "react-hook-form";

import { Send } from "lucide-react";

import { Form } from "@/components/Form";
import { Loader } from "@/components/ui/Loader";
import { useCreateLead } from "@/lib/leads/useCreateLead";

type LeadRequestFormProps = {
  readonly formCode: string;
  readonly formTitle: string;
  readonly showDetails?: boolean;
  readonly sourcePage: string;
  readonly successMessage?: string;
};

type LeadFormValues = {
  comment: string;
  email: string;
  name: string;
  phone: string;
};

export const LeadRequestForm = ({
  formCode,
  formTitle,
  showDetails = false,
  sourcePage,
  successMessage = "Заявка принята. Мы скоро свяжемся с вами.",
}: LeadRequestFormProps) => {
  const lead = useCreateLead();
  const form = useForm<LeadFormValues>({
    defaultValues: { comment: "", email: "", name: "", phone: "" },
  });

  return (
    <Form
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
      form={form}
      onSubmit={(values) => {
        lead.mutate({
          comment: values.comment || undefined,
          email: values.email || undefined,
          formCode,
          formTitle,
          name: values.name,
          phone: values.phone,
          sourcePage,
        });
      }}
    >
      <input
        className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none placeholder:text-brand-foreground/60 focus:border-brand-foreground"
        placeholder="Ваше имя"
        {...form.register("name", { required: true })}
      />
      <input
        className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none placeholder:text-brand-foreground/60 focus:border-brand-foreground"
        placeholder="Телефон"
        type="tel"
        {...form.register("phone", { required: true })}
      />
      {showDetails && (
        <>
          <input
            className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none placeholder:text-brand-foreground/60 focus:border-brand-foreground sm:col-span-2"
            placeholder="Электронная почта"
            type="email"
            {...form.register("email", { required: showDetails })}
          />
          <textarea
            className="min-h-28 rounded-3xl border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none placeholder:text-brand-foreground/60 focus:border-brand-foreground sm:col-span-3"
            placeholder="Расскажите о формате и количестве гостей"
            {...form.register("comment")}
          />
        </>
      )}
      <button
        className="inline-flex items-center justify-center gap-2 rounded-full bg-panel px-7 py-4 font-semibold text-brand disabled:opacity-60"
        disabled={lead.isPending}
        type="submit"
      >
        {lead.isPending ? <Loader size="sm" /> : <Send className="size-4" />}
        Отправить
      </button>
      {lead.isSuccess && <p className="sm:col-span-3">{successMessage}</p>}
      {lead.isError && (
        <p className="sm:col-span-3">
          Не удалось отправить заявку. Попробуйте ещё раз.
        </p>
      )}
    </Form>
  );
};
