import { useForm } from "react-hook-form";

import { Form } from "@/components/Form";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { useCompleteGuestProfile } from "@/lib/auth/useGuestAuth";

type ProfileNameForm = { fullName: string };

export const AccountNameCompletion = ({
  email,
  fullName,
  onLogout,
}: {
  readonly email: string | null;
  readonly fullName: string | null;
  readonly onLogout: () => void;
}) => {
  const form = useForm<ProfileNameForm>({
    defaultValues: { fullName: fullName ?? "" },
  });
  const saveProfile = useCompleteGuestProfile();

  return (
    <main className="min-h-screen bg-page px-4 pt-24 pb-20 sm:pt-32">
      <SiteHeader light />
      <section className="mx-auto w-full max-w-2xl rounded-4xl border border-line bg-panel p-6 shadow-xl sm:p-9">
        <h1 className="font-heading text-4xl font-semibold text-brand">
          Проверьте имя профиля
        </h1>
        <p className="mt-3 leading-7 text-muted-ui-foreground">
          Исправьте имя, если нужно, или подтвердите указанное. После этого оно
          не будет автоматически меняться из-за новых заказов.
        </p>
        {email && (
          <p className="mt-3 text-sm text-muted-ui-foreground">
            Аккаунт: {email}
          </p>
        )}
        <Form
          className="mt-7 space-y-5"
          form={form}
          onSubmit={({ fullName: submittedName }) =>
            saveProfile.mutate({ fullName: submittedName.trim() })
          }
        >
          <TextField
            autoComplete="name"
            error={form.formState.errors.fullName?.message}
            label="Имя и фамилия"
            maxLength={160}
            placeholder="Иван Иванов"
            {...form.register("fullName", {
              required: "Введите имя и фамилию",
              validate: (value) =>
                value.trim().length >= 2 || "Укажите не менее двух символов",
            })}
          />
          <Button
            className="w-full"
            disabled={saveProfile.isPending}
            type="submit"
          >
            {saveProfile.isPending
              ? "Сохраняем…"
              : fullName?.trim()
                ? "Подтвердить имя"
                : "Сохранить имя"}
          </Button>
        </Form>
        <button
          className="mt-4 w-full rounded-full border border-line px-5 py-3 font-semibold text-brand"
          onClick={onLogout}
          type="button"
        >
          Выйти из аккаунта
        </button>
      </section>
    </main>
  );
};
