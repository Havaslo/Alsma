import { useForm } from "react-hook-form";

import { Form } from "@/components/Form";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { useCreateLead } from "@/lib/leads/useCreateLead";

export type SpaRequestOpenHandler = () => void;

type SpaRequestModalProps = {
  readonly formCode?: string;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly procedureName?: string;
  readonly sourcePage?: string;
};

type SpaRequestValues = {
  comment: string;
  email: string;
  phone: string;
};

export const SpaRequestModal = ({
  formCode = "spa-request",
  onClose,
  open,
  procedureName,
  sourcePage = "spa",
}: SpaRequestModalProps) => {
  const lead = useCreateLead();
  const form = useForm<SpaRequestValues>({
    defaultValues: { comment: "", email: "", phone: "" },
  });
  const isProcedureRequest = Boolean(procedureName);
  const formTitle = procedureName
    ? `Запись на процедуру: ${procedureName}`
    : "Запись на SPA-процедуру";

  return (
    <Modal
      className="max-w-3xl rounded-4xl bg-page"
      closeButtonClassName="absolute top-8 right-8 sm:top-10 sm:right-12"
      closeLabel="Закрыть"
      headerClassName="relative block border-b-0 px-10 pt-8 pb-0 sm:px-12 sm:pt-10"
      headerContent={
        <div className="space-y-3 pr-12 sm:pr-16">
          <p className="text-sm font-semibold text-brand">
            {isProcedureRequest ? "Запись на процедуру" : "Заявка на SPA"}
          </p>
          <h2 className="font-heading text-3xl leading-tight font-semibold text-panel-foreground sm:text-5xl">
            Записаться на процедуру
          </h2>
          <p className="max-w-2xl text-lg leading-8 text-muted-ui-foreground">
            Оставьте контакты, и мы поможем подобрать удобное время и подходящую
            процедуру.
          </p>
          {procedureName && (
            <p className="text-lg font-semibold text-brand">
              Запись на: {procedureName}
            </p>
          )}
        </div>
      }
      onClose={onClose}
      open={open}
      title="Записаться на процедуру"
    >
      <Form
        className="space-y-6 px-4 pb-4 sm:px-2 sm:pb-6"
        form={form}
        onSubmit={(values) => {
          lead.mutate({
            comment: values.comment || undefined,
            email: values.email || undefined,
            formCode,
            formTitle,
            phone: values.phone,
            sourcePage,
          });
        }}
      >
        <label className="block space-y-2" htmlFor="spa-request-phone">
          <span className="text-lg font-medium">Номер</span>
          <input
            className="w-full rounded-2xl border border-line bg-page px-5 py-4 text-lg text-page-foreground outline-none placeholder:text-muted-ui-foreground/70 focus:border-brand focus:ring-4 focus:ring-focus/20"
            id="spa-request-phone"
            placeholder="+7 (___) ___-__-__"
            type="tel"
            {...form.register("phone", { required: true })}
          />
        </label>
        <label className="block space-y-2" htmlFor="spa-request-email">
          <span className="text-lg font-medium">Почта</span>
          <input
            className="w-full rounded-2xl border border-line bg-page px-5 py-4 text-lg text-page-foreground outline-none placeholder:text-muted-ui-foreground/70 focus:border-brand focus:ring-4 focus:ring-focus/20"
            id="spa-request-email"
            placeholder="you@example.com"
            type="email"
            {...form.register("email")}
          />
        </label>
        <label className="block space-y-2" htmlFor="spa-request-comment">
          <span className="text-lg font-medium">Комментарий</span>
          <textarea
            className="min-h-36 w-full resize-y rounded-2xl border border-line bg-page px-5 py-4 text-lg text-page-foreground outline-none placeholder:text-muted-ui-foreground/70 focus:border-brand focus:ring-4 focus:ring-focus/20"
            id="spa-request-comment"
            placeholder={
              procedureName
                ? "Дополнительная информация по записи"
                : "Напишите, на какую процедуру хотите записаться"
            }
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
          <p className="text-center text-brand">
            Заявка принята. Мы скоро свяжемся с вами.
          </p>
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
