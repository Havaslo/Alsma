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
  readonly variant?: "brand" | "panel";
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
  variant = "brand",
}: LeadRequestFormProps) => {
  const lead = useCreateLead();
  const fieldClassName =
    variant === "panel"
      ? "rounded-full border border-line bg-page px-5 py-4 text-page-foreground outline-none placeholder:text-muted-ui-foreground focus:border-brand"
      : "rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none placeholder:text-brand-foreground/60 focus:border-brand-foreground";
  const textareaClassName =
    variant === "panel"
      ? "min-h-28 rounded-3xl border border-line bg-page px-5 py-4 text-page-foreground outline-none placeholder:text-muted-ui-foreground focus:border-brand sm:col-span-3"
      : "min-h-28 rounded-3xl border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-4 outline-none placeholder:text-brand-foreground/60 focus:border-brand-foreground sm:col-span-3";
  const buttonClassName =
    variant === "panel"
      ? "inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 font-semibold text-brand-foreground disabled:opacity-60"
      : "inline-flex items-center justify-center gap-2 rounded-full bg-panel px-7 py-4 font-semibold text-brand disabled:opacity-60";
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
        className={fieldClassName}
        placeholder="Ваше имя"
        {...form.register("name", { required: true })}
      />
      <input
        className={fieldClassName}
        placeholder="Телефон"
        type="tel"
        {...form.register("phone", { required: true })}
      />
      {showDetails && (
        <>
          <input
            className={`${fieldClassName} sm:col-span-2`}
            placeholder="Электронная почта"
            type="email"
            {...form.register("email", { required: showDetails })}
          />
          <textarea
            className={textareaClassName}
            placeholder="Расскажите о формате и количестве гостей"
            {...form.register("comment")}
          />
        </>
      )}
      <button
        className={buttonClassName}
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
