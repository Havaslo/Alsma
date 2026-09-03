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
  readonly appointmentTimeRequired?: boolean;
  readonly successMessage?: string;
};

type LeadRequestValues = {
  appointmentTime: string;
  comment: string;
  email: string;
  name: string;
  phone: string;
};

const formatPhone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits === "7") return "+7";
  if (digits.startsWith("8")) digits = digits.slice(1);
  if (digits.startsWith("7")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (!digits) return "";

  const groups = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ];
  let result = "+7";
  if (groups[0]) result += ` (${groups[0]}`;
  if (groups[0]?.length === 3) result += ")";
  if (groups[1]) result += ` ${groups[1]}`;
  if (groups[2]) result += `-${groups[2]}`;
  if (groups[3]) result += `-${groups[3]}`;
  return result;
};

const isPhoneComplete = (value: string) =>
  value.replace(/\D/g, "").length === 11;

const inputClassName =
  "min-h-16 w-full rounded-2xl border border-line bg-page px-5 py-4 text-lg text-page-foreground outline-none placeholder:text-muted-ui-foreground/70 focus:border-brand focus:ring-4 focus:ring-focus/15";

export const LeadRequestModal = ({
  commentPlaceholder,
  appointmentTimeRequired = false,
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
    defaultValues: {
      appointmentTime: "",
      comment: "",
      email: "",
      name: "",
      phone: "",
    },
  });
  const phoneRegistration = form.register("phone", {
    required: phoneRequired,
    validate: (value) =>
      !value || isPhoneComplete(value) || "Введите полный номер телефона",
    onChange: (event) => {
      form.setValue("phone", formatPhone(event.target.value), {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
  });

  return (
    <Modal
      className="max-w-3xl rounded-4xl bg-[#FFFFFF]"
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
          const comment = appointmentTimeRequired
            ? [
                `Выбранное клиентом время: ${values.appointmentTime}`,
                values.comment.trim(),
              ]
                .filter(Boolean)
                .join("\n")
            : values.comment || undefined;
          lead.mutate(
            {
              comment,
              appointmentTime: values.appointmentTime || undefined,
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
            inputMode="tel"
            {...phoneRegistration}
            onKeyDown={(event) => {
              if (
                !/[0-9]/.test(event.key) &&
                ![
                  "Backspace",
                  "Delete",
                  "ArrowLeft",
                  "ArrowRight",
                  "Home",
                  "End",
                  "Tab",
                ].includes(event.key) &&
                !(event.ctrlKey || event.metaKey)
              ) {
                event.preventDefault();
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
              form.setValue(
                "phone",
                formatPhone(event.clipboardData.getData("text")),
                { shouldDirty: true, shouldValidate: true },
              );
            }}
          />
          {form.formState.errors.phone && (
            <span className="text-sm text-destructive">
              {form.formState.errors.phone.message ||
                "Введите корректный номер телефона"}
            </span>
          )}
        </label>
        <label className="block space-y-2" htmlFor={`${formCode}-email`}>
          <span className="text-lg font-medium">Почта</span>
          <input
            className={inputClassName}
            id={`${formCode}-email`}
            placeholder="you@example.com"
            type="email"
            {...form.register("email", {
              pattern: {
                message: "Введите корректный email",
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              },
              required: emailRequired,
            })}
          />
          {form.formState.errors.email && (
            <span className="text-sm text-destructive">
              {form.formState.errors.email.message ||
                "Введите корректный email"}
            </span>
          )}
        </label>
        {appointmentTimeRequired && (
          <label
            className="block space-y-2"
            htmlFor={`${formCode}-appointment-time`}
          >
            <span className="text-lg font-medium">Удобное время</span>
            <select
              className={inputClassName}
              id={`${formCode}-appointment-time`}
              {...form.register("appointmentTime", {
                required: "Выберите удобное время",
              })}
            >
              <option value="">Выберите время</option>
              {Array.from({ length: 48 }, (_, index) => {
                const hours = String(Math.floor(index / 2)).padStart(2, "0");
                const minutes = index % 2 === 0 ? "00" : "30";
                const value = `${hours}:${minutes}`;
                return (
                  <option key={value} value={value}>
                    {value}
                  </option>
                );
              })}
            </select>
            {form.formState.errors.appointmentTime && (
              <span className="text-sm text-destructive">
                {form.formState.errors.appointmentTime.message}
              </span>
            )}
          </label>
        )}
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
