import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { Form } from "@/components/Form";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Loader } from "@/components/ui/Loader";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { requestLoginCode, verifyLoginCode } from "@/lib/auth/guest-auth-api";
import { writeGuestSession } from "@/lib/auth/session";

export const LoginPage = () => {
  const navigate = useNavigate();
  const requestForm = useForm({
    defaultValues: { channel: "phone" as "email" | "phone", contact: "" },
  });
  const verifyForm = useForm({ defaultValues: { code: "" } });
  const channel = useWatch({
    control: requestForm.control,
    name: "channel",
  });
  const code = useWatch({ control: verifyForm.control, name: "code" });
  const [pending, setPending] = useState<{
    debugCode: string;
    maskedContact: string;
    pendingCodeId: string;
  } | null>(null);
  const requestMutation = useMutation({
    mutationFn: requestLoginCode,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Не удалось получить код.")),
    onSuccess: ({ data }) => setPending(data),
  });
  const verifyMutation = useMutation({
    mutationFn: verifyLoginCode,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Не удалось подтвердить код.")),
    onSuccess: ({ data }) => {
      writeGuestSession(data.token);
      navigate(AMAZI_ROUTES.account);
    },
  });

  return (
    <main className="min-h-screen bg-page px-4 pt-32 pb-16 text-page-foreground">
      <SiteHeader light />
      <section className="mx-auto w-full max-w-xl rounded-4xl border border-line bg-panel p-6 shadow-xl sm:p-9">
        {!pending ? (
          <>
            <h1 className="font-heading text-4xl font-semibold text-brand">
              Вход в личный кабинет
            </h1>
            <p className="mt-3 leading-7 text-muted-ui-foreground">
              Выберите способ входа и получите четырёхзначный код подтверждения.
            </p>
            <div className="mt-7 grid grid-cols-2 rounded-full bg-muted-ui p-1.5">
              {(["phone", "email"] as const).map((value) => (
                <button
                  className={
                    value === channel
                      ? "rounded-full bg-brand px-4 py-3 font-semibold text-brand-foreground"
                      : "rounded-full px-4 py-3 font-semibold text-brand"
                  }
                  key={value}
                  onClick={() => {
                    requestForm.setValue("channel", value);
                    requestForm.resetField("contact");
                  }}
                  type="button"
                >
                  {value === "phone" ? "По телефону" : "По почте"}
                </button>
              ))}
            </div>
            <Form
              className="mt-7 space-y-5"
              form={requestForm}
              onSubmit={(values) => requestMutation.mutate(values)}
            >
              <label className="block text-sm font-medium">
                {channel === "phone" ? "Номер телефона" : "Электронная почта"}
                <input
                  className="mt-2 w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-focus"
                  placeholder={
                    channel === "phone"
                      ? "+7 (___) ___-__-__"
                      : "you@example.com"
                  }
                  type={channel === "email" ? "email" : "tel"}
                  {...requestForm.register("contact", { required: true })}
                />
              </label>
              <button
                className="flex w-full items-center justify-center rounded-full bg-brand px-5 py-4 font-semibold text-brand-foreground disabled:opacity-60"
                disabled={requestMutation.isPending}
                type="submit"
              >
                {requestMutation.isPending && (
                  <Loader className="mr-2" size="sm" />
                )}
                Получить код
              </button>
            </Form>
          </>
        ) : (
          <>
            <button
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand"
              onClick={() => setPending(null)}
              type="button"
            >
              <ArrowLeft className="size-4" />
              Изменить контакт
            </button>
            <h1 className="font-heading text-4xl font-semibold text-brand">
              Подтвердите вход
            </h1>
            <p className="mt-3 leading-7 text-muted-ui-foreground">
              Код отправлен на {pending.maskedContact}. Для локальной проверки
              используйте{" "}
              <strong className="text-brand">{pending.debugCode}</strong>.
            </p>
            <Form
              className="mt-7 space-y-5"
              form={verifyForm}
              onSubmit={(values) => {
                verifyMutation.mutate({
                  code: values.code,
                  pendingCodeId: pending.pendingCodeId,
                });
              }}
            >
              <input
                autoFocus
                className="w-full rounded-2xl border border-line bg-page px-5 py-4 text-center text-3xl font-semibold tracking-widest outline-none focus:border-focus"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                {...verifyForm.register("code", {
                  onChange: (event) => {
                    verifyForm.setValue(
                      "code",
                      String(event.target.value).replace(/\D/g, "").slice(0, 4),
                    );
                  },
                })}
              />
              <button
                className="w-full rounded-full bg-brand px-5 py-4 font-semibold text-brand-foreground disabled:opacity-60"
                disabled={code.length !== 4 || verifyMutation.isPending}
                type="submit"
              >
                Подтвердить вход
              </button>
            </Form>
          </>
        )}
      </section>
    </main>
  );
};
