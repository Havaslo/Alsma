import { useFormContext } from "react-hook-form";

export type LeadConsentFormValues = {
  readonly personalDataConsent: boolean;
  readonly marketingChannels: string[];
};

export const LeadConsentFields = ({
  idPrefix,
  variant = "panel",
  allowEmail = true,
  className = "",
}: {
  readonly idPrefix: string;
  readonly variant?: "brand" | "panel";
  readonly allowEmail?: boolean;
  readonly className?: string;
}) => {
  const {
    formState: { errors },
    register,
  } = useFormContext<LeadConsentFormValues>();
  const labelColor =
    variant === "brand"
      ? "text-brand-foreground/85"
      : "text-muted-ui-foreground";
  const linkColor =
    variant === "brand" ? "text-brand-foreground" : "text-brand";
  const checkClassName =
    "mt-1 size-4 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

  return (
    <div className={`space-y-4 text-sm leading-6 ${labelColor} ${className}`}>
      <label className="flex items-start gap-3">
        <input
          className={checkClassName}
          type="checkbox"
          {...register("personalDataConsent", {
            required: "Подтвердите отдельное согласие на обработку данных.",
          })}
        />
        <span>
          Даю отдельное согласие на обработку персональных данных для ответа на
          обращение.{" "}
          <a className={`${linkColor} underline`} href="/consent">
            Текст согласия
          </a>{" "}
          ·{" "}
          <a className={`${linkColor} underline`} href="/privacy">
            Политика обработки персональных данных
          </a>
        </span>
      </label>
      {typeof errors.personalDataConsent?.message === "string" && (
        <p className="pl-7 text-destructive" role="alert">
          {errors.personalDataConsent.message}
        </p>
      )}
      <fieldset className="rounded-2xl border border-current/15 p-4">
        <legend className="px-1 font-medium">
          Рекламные сообщения — необязательно
        </legend>
        <p className="mb-3">
          Отметьте, если хотите получать новости и предложения ООО «Алсма» по
          выбранным каналам. Это не влияет на отправку заявки.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {allowEmail && (
            <label className="flex items-start gap-2">
              <input
                className={checkClassName}
                type="checkbox"
                value="email"
                {...register("marketingChannels")}
              />
              <span>Электронная почта</span>
            </label>
          )}
          <label className="flex items-start gap-2">
            <input
              className={checkClassName}
              type="checkbox"
              value="sms"
              {...register("marketingChannels")}
            />
            <span>SMS</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              className={checkClassName}
              type="checkbox"
              value="phone_call"
              {...register("marketingChannels")}
            />
            <span>Звонки</span>
          </label>
        </div>
        <p className="mt-3">
          Отказаться от рекламных сообщений можно в любое время:{" "}
          <a className={`${linkColor} underline`} href="mailto:info@alsma.ru">
            info@alsma.ru
          </a>
          .
        </p>
      </fieldset>
      <span className="sr-only">Форма: {idPrefix}</span>
    </div>
  );
};
