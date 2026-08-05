import { useForm } from "react-hook-form";

import { Form } from "@/components/Form";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { useCreateLead } from "@/lib/leads/useCreateLead";

type LeadRequestModalProps = {
  readonly description: string;
  readonly emailRequired?: boolean;
  readonly formCode: string;
  readonly formTitle: string;
  readonly nameRequired?: boolean;
  readonly contextText?: string;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly phoneRequired?: boolean;
  readonly sourcePage: string;
  readonly title: string;
  readonly eyebrow?: string;
  readonly namePlaceholder?: string;
  readonly commentPlaceholder: string;
  readonly successMessage?: string;
};

type LeadRequestValues = {
  comment: string;
  email: string;
  name: string;
  phone: string;
};

const inputClassName =
  "min-h-16 w-full rounded-2xl border border-line bg-page px-5 py-4 text-lg text-page-foreground outline-none placeholder:text-muted-ui-foreground/70 focus:border-brand focus:ring-4 focus:ring-focus/15";

export const LeadRequestModal = ({
  commentPlaceholder,
  contextText,
  description,
  emailRequired = false,
  eyebrow,
  formCode,
  formTitle,
  namePlaceholder = "Ваше имя",
  nameRequired = false,
  onClose,
  open,
  phoneRequired = true,
  sourcePage,
  successMessage = "Заявка принята. Мы скоро свяжемся с вами.",
  title,
}: LeadRequestModalProps) => {
  const lead = useCreateLead();
  const form = useForm<LeadRequestValues>({
    defaultValues: { comment: "", email: "", name: "", phone: "" },
  });

  return (
    <Modal
      className="max-w-3xl rounded-4xl bg-page"
      closeLabel="Закрыть форму заявки"
      headerClassName="items-start border-b-0 px-6 pt-8 pb-0 sm:px-10 sm:pt-10"
      headerContent={
        <div className="space-y-3 pr-12 sm:pr-16">
          {eyebrow && (
            <p className="text-sm font-semibold tracking-wide text-brand/60">
              {eyebrow}
            </p>
          )}
          <h2 className="font-heading text-3xl leading-[1.08] font-semibold sm:text-5xl">
            {title}
          </h2>
          <p className="max-w-3xl text-lg leading-8 text-muted-ui-foreground">
            {description}
          </p>
          {contextText && (
            <p className="text-lg font-semibold text-brand">{contextText}</p>
          )}
        </div>
      }
      onClose={onClose}
      open={open}
      title={title}
    >
      <Form
        className="space-y-6 pt-6 pb-2 sm:pt-8"
        form={form}
        onSubmit={(values) => {
          lead.mutate(
            {
              comment: values.comment || undefined,
              email: values.email || undefined,
              formCode,
              formTitle,
              name: values.name || undefined,
              phone: values.phone,
              sourcePage,
            },
            { onSuccess: () => form.reset() },
          );
        }}
      >
        {nameRequired && (
          <label className="block space-y-2" htmlFor={`${formCode}-name`}>
            <span className="text-lg font-medium">Имя</span>
            <input
              className={inputClassName}
              id={`${formCode}-name`}
              placeholder={namePlaceholder}
              {...form.register("name", { required: nameRequired })}
            />
          </label>
        )}
        <label className="block space-y-2" htmlFor={`${formCode}-phone`}>
          <span className="text-lg font-medium">Номер</span>
          <input
            className={inputClassName}
            id={`${formCode}-phone`}
            placeholder="+7 (___) ___-__-__"
            type="tel"
            {...form.register("phone", { required: phoneRequired })}
          />
        </label>
        <label className="block space-y-2" htmlFor={`${formCode}-email`}>
          <span className="text-lg font-medium">Почта</span>
          <input
            className={inputClassName}
            id={`${formCode}-email`}
            placeholder="you@example.com"
            type="email"
            {...form.register("email", { required: emailRequired })}
          />
        </label>
        <label className="block space-y-2" htmlFor={`${formCode}-comment`}>
          <span className="text-lg font-medium">Комментарий</span>
          <textarea
            className="min-h-36 w-full resize-y rounded-2xl border border-line bg-page px-5 py-4 text-lg text-page-foreground outline-none placeholder:text-muted-ui-foreground/70 focus:border-brand focus:ring-4 focus:ring-focus/15"
            id={`${formCode}-comment`}
            placeholder={commentPlaceholder}
            {...form.register("comment")}
          />
        </label>
        <button
          className="inline-flex min-h-16 w-full items-center justify-center rounded-full bg-brand px-7 py-4 text-lg font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={lead.isPending}
          type="submit"
        >
          {lead.isPending && <Loader size="sm" />}
          Отправить заявку
        </button>
        {lead.isSuccess && (
          <p className="text-center text-brand">{successMessage}</p>
        )}
        {lead.isError && (
          <p className="text-center text-destructive">
            Не удалось отправить заявку. Попробуйте ещё раз.
          </p>
        )}
      </Form>
    </Modal>
  );
};
