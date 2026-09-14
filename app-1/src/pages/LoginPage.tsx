import { useState } from "react";
import { useForm } from "react-hook-form";

import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Form } from "@/components/Form";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Loader } from "@/components/ui/Loader";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { requestGuestCode, verifyGuestCode } from "@/lib/auth/guest-auth-api";
import { ROUTES } from "@/route-constants";

export const LoginPage = () => {
  const navigate = useNavigate();
  const form = useForm({ defaultValues: { email: "", code: "" } });
  const [isCodeStep, setIsCodeStep] = useState(false);
  const requestCodeMutation = useMutation({
    mutationFn: requestGuestCode,
    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, "Не удалось отправить код подтверждения."),
      ),
    onSuccess: (_, variables) => {
      form.reset({ email: variables.email, code: "" });
      setIsCodeStep(true);
      toast.success("Код подтверждения отправлен на вашу почту.");
    },
  });
  const verifyCodeMutation = useMutation({
    mutationFn: verifyGuestCode,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Не удалось подтвердить почту.")),
    onSuccess: () => {
      navigate({ to: ROUTES.account });
    },
  });

  const email = form.getValues("email");
  const codeRegistration = form.register("code", {
    onChange: (event) => {
      event.target.value = event.target.value.replace(/\D/gu, "").slice(0, 4);
    },
    pattern: isCodeStep
      ? {
          value: /^\d{4}$/u,
          message: "Введите 4 цифры из письма",
        }
      : undefined,
    required: isCodeStep ? "Введите код из письма" : false,
  });
  const isPending =
    requestCodeMutation.isPending || verifyCodeMutation.isPending;

  const goBackToEmail = () => {
    requestCodeMutation.reset();
    verifyCodeMutation.reset();
    form.setValue("code", "");
    setIsCodeStep(false);
  };

  return (
    <main className="min-h-screen bg-page px-4 pt-24 pb-16 text-page-foreground sm:pt-32">
      <SiteHeader light />
      <section className="mx-auto w-full max-w-xl rounded-4xl border border-line bg-panel p-6 shadow-xl sm:p-9">
        <h1 className="font-heading text-4xl font-semibold text-brand">
          Вход в личный кабинет
        </h1>
        <p className="mt-3 leading-7 text-muted-ui-foreground">
          {isCodeStep
            ? "Введите код из письма, чтобы подтвердить электронную почту."
            : "Введите электронную почту, чтобы получить код для входа в личный кабинет."}
        </p>
        <Form
          className="mt-7 space-y-5"
          form={form}
          onSubmit={(values) => {
            if (isCodeStep) {
              verifyCodeMutation.mutate({
                code: values.code,
                email: values.email,
              });
              return;
            }
            requestCodeMutation.mutate({ email: values.email });
          }}
          onInvalid={(errors) => {
            const message = isCodeStep
              ? errors.code?.message
              : errors.email?.message;
            if (typeof message === "string") toast.error(message);
          }}
        >
          {!isCodeStep ? (
            <label className="block text-sm font-medium">
              Электронная почта
              <input
                autoComplete="email"
                className="mt-2 w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-focus"
                placeholder="you@example.com"
                type="email"
                {...form.register("email", {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/u,
                    message: "Введите корректную электронную почту",
                  },
                  required: "Введите электронную почту",
                })}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl bg-page px-5 py-4 text-sm text-muted-ui-foreground">
                Код отправлен на{" "}
                <strong className="text-page-foreground">{email}</strong>
              </div>
              <label className="block text-sm font-medium">
                Код подтверждения
                <input
                  autoComplete="one-time-code"
                  autoFocus
                  className="mt-2 w-full rounded-2xl border border-line bg-page px-5 py-4 text-center text-2xl tracking-[0.5em] outline-none focus:border-focus"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  type="text"
                  {...codeRegistration}
                />
              </label>
              <p className="text-sm leading-6 text-muted-ui-foreground">
                Код действителен 10 минут.
              </p>
            </div>
          )}
          <button
            className="flex w-full items-center justify-center rounded-full bg-brand px-5 py-4 font-semibold text-brand-foreground disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending && <Loader className="mr-2" size="sm" />}
            {isCodeStep ? "Далее" : "Войти"}
          </button>
          {isCodeStep && (
            <button
              className="w-full rounded-full border border-line px-5 py-3 font-semibold text-brand transition hover:border-brand disabled:opacity-60"
              disabled={isPending}
              onClick={goBackToEmail}
              type="button"
            >
              Изменить электронную почту
            </button>
          )}
        </Form>
        <p className="mt-5 text-center text-sm leading-6 text-muted-ui-foreground">
          Входя в личный кабинет, вы соглашаетесь с{" "}
          <Link className="font-semibold text-brand" to={ROUTES.privacy}>
            политикой конфиденциальности
          </Link>
          .
        </p>
      </section>
    </main>
  );
};
