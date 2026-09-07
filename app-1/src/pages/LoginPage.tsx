import { useForm } from "react-hook-form";

import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Form } from "@/components/Form";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Loader } from "@/components/ui/Loader";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { loginByEmail } from "@/lib/auth/guest-auth-api";
import { writeGuestSession } from "@/lib/auth/session";
import { ROUTES } from "@/route-constants";

export const LoginPage = () => {
  const navigate = useNavigate();
  const form = useForm({ defaultValues: { email: "", code: "" } });
  const loginMutation = useMutation({
    mutationFn: loginByEmail,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Не удалось войти.")),
    onSuccess: () => {
      writeGuestSession(null);
      navigate({ to: ROUTES.account });
    },
  });

  return (
    <main className="min-h-screen bg-page px-4 pt-24 pb-16 text-page-foreground sm:pt-32">
      <SiteHeader light />
      <section className="mx-auto w-full max-w-xl rounded-4xl border border-line bg-panel p-6 shadow-xl sm:p-9">
        <h1 className="font-heading text-4xl font-semibold text-brand">
          Вход в личный кабинет
        </h1>
        <p className="mt-3 leading-7 text-muted-ui-foreground">
          Введите электронную почту, чтобы открыть личный кабинет и увидеть
          историю покупок.
        </p>
        <Form
          className="mt-7 space-y-5"
          form={form}
          onSubmit={(values) => loginMutation.mutate({ email: values.email })}
        >
          <label className="block text-sm font-medium">
            Электронная почта
            <input
              className="mt-2 w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-focus"
              placeholder="you@example.com"
              type="email"
              {...form.register("email", {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Введите корректную электронную почту",
                },
                required: true,
              })}
            />
          </label>
          <button
            className="flex w-full items-center justify-center rounded-full bg-brand px-5 py-4 font-semibold text-brand-foreground disabled:opacity-60"
            disabled={loginMutation.isPending}
            type="submit"
          >
            {loginMutation.isPending && <Loader className="mr-2" size="sm" />}
            Войти в личный кабинет
          </button>
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
