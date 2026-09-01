import { useForm } from "react-hook-form";

import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import logoGreen from "@/assets/alsma/logo-green.svg";
import { Form } from "@/components/Form";
import { Loader } from "@/components/ui/Loader";
import { adminLogin } from "@/lib/admin/admin-api";
import { writeAdminSession } from "@/lib/admin/admin-session";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { ROUTES } from "@/route-constants";

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: { email: "admin@example.com", password: "" },
  });
  const mutation = useMutation({
    mutationFn: adminLogin,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Не удалось войти.")),
    onSuccess: ({ data }) => {
      writeAdminSession(null);
      navigate({ to: ROUTES.adminDashboard });
    },
  });
  return (
    <main className="grid min-h-screen place-items-center bg-page px-4">
      <section className="w-full max-w-md rounded-4xl border border-line bg-panel p-8 shadow-xl">
        <img alt="АЛСМА" className="h-12 w-40 object-contain" src={logoGreen} />
        <div className="mt-8 grid size-12 place-items-center rounded-2xl bg-brand text-brand-foreground">
          <LockKeyhole className="size-5" />
        </div>
        <h1 className="mt-5 font-heading text-4xl font-semibold text-brand">
          Вход для сотрудников
        </h1>
        <p className="mt-3 text-muted-ui-foreground">
          Управление заявками, гостями и содержимым сайта.
        </p>
        <Form
          className="mt-7 space-y-4"
          form={form}
          onSubmit={(values) => mutation.mutate(values)}
        >
          <label className="block text-sm font-medium">
            Электронная почта
            <input
              className="mt-2 w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-focus"
              type="email"
              {...form.register("email", { required: true })}
            />
          </label>
          <label className="block text-sm font-medium">
            Пароль
            <input
              className="mt-2 w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-focus"
              type="password"
              {...form.register("password", { required: true })}
            />
          </label>
          <button
            className="flex w-full items-center justify-center rounded-full bg-brand px-5 py-4 font-semibold text-brand-foreground disabled:opacity-60"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending && <Loader className="mr-2" size="sm" />}
            Войти
          </button>
        </Form>
      </section>
    </main>
  );
};
