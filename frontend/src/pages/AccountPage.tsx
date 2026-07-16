import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Gift,
  LoaderCircle,
  LogOut,
  Mail,
  Phone,
} from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { SiteHeader } from "@/components/site/SiteHeader";
import { completeGuestProfile } from "@/lib/auth/guest-auth-api";
import { writeGuestSession } from "@/lib/auth/session";
import { GUEST_PROFILE_QUERY_KEY, useGuestAuth } from "@/lib/auth/useGuestAuth";

export const AccountPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useGuestAuth();
  const guest = auth.data?.guest;
  const [fullName, setFullName] = useState("");
  const profileMutation = useMutation({
    mutationFn: completeGuestProfile,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: GUEST_PROFILE_QUERY_KEY }),
  });
  if (auth.isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-page">
        <LoaderCircle className="size-8 animate-spin text-brand" />
      </main>
    );
  if (!guest) return <Navigate replace to={AMAZI_ROUTES.login} />;
  if (guest.requiresNameCompletion)
    return (
      <main className="min-h-screen bg-page px-4 pt-32">
        <SiteHeader light />
        <section className="mx-auto max-w-xl rounded-4xl border border-line bg-panel p-8 shadow-xl">
          <h1 className="font-heading text-4xl font-semibold text-brand">
            Как к вам обращаться?
          </h1>
          <p className="mt-3 text-muted-ui-foreground">
            Имя будет отображаться в личном кабинете и бронированиях.
          </p>
          <form
            className="mt-7 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              profileMutation.mutate({ fullName });
            }}
          >
            <input
              className="w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-focus"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ваше имя"
              required
              value={fullName}
            />
            <button
              className="w-full rounded-full bg-brand px-5 py-4 font-semibold text-brand-foreground"
              type="submit"
            >
              Продолжить
            </button>
          </form>
        </section>
      </main>
    );
  const logout = () => {
    writeGuestSession(null);
    queryClient.clear();
    navigate(AMAZI_ROUTES.home);
  };
  return (
    <main className="min-h-screen bg-page px-4 pt-32 pb-20">
      <SiteHeader light />
      <div className="mx-auto max-w-6xl overflow-hidden rounded-4xl border border-line bg-panel shadow-xl">
        <section className="flex flex-col justify-between gap-6 border-b border-line p-7 sm:flex-row sm:items-center">
          <div className="flex items-center gap-5">
            <div className="grid size-20 place-items-center rounded-full bg-brand text-3xl font-semibold text-brand-foreground">
              {guest.fullName?.[0]}
            </div>
            <div>
              <h1 className="font-heading text-4xl font-semibold text-brand">
                {guest.fullName}
              </h1>
              <div className="mt-3 space-y-1 text-sm text-muted-ui-foreground">
                {guest.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="size-4 text-brand" />
                    {guest.phone}
                  </p>
                )}
                {guest.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="size-4 text-brand" />
                    {guest.email}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 font-semibold text-brand"
            onClick={logout}
            type="button"
          >
            <LogOut className="size-4" />
            Выйти
          </button>
        </section>
        <section className="grid gap-6 p-7 md:grid-cols-2">
          <article className="rounded-3xl border border-line p-6">
            <CalendarDays className="size-8 text-brand" />
            <h2 className="mt-4 font-heading text-2xl font-semibold text-brand">
              Мои бронирования
            </h2>
            <p className="mt-3 leading-7 text-muted-ui-foreground">
              Здесь появятся предстоящие и завершённые поездки, даты проживания
              и состав услуг.
            </p>
            <div className="mt-6 rounded-2xl bg-muted-ui p-5 text-sm text-muted-ui-foreground">
              Активных бронирований пока нет.
            </div>
          </article>
          <article className="rounded-3xl border border-line p-6">
            <Gift className="size-8 text-brand" />
            <h2 className="mt-4 font-heading text-2xl font-semibold text-brand">
              Программа лояльности
            </h2>
            <p className="mt-3 leading-7 text-muted-ui-foreground">
              Накапливайте ночи и получайте персональные привилегии для
              следующего отдыха.
            </p>
            <div className="mt-6 rounded-2xl bg-brand p-5 text-brand-foreground">
              <p className="text-sm opacity-70">Текущий уровень</p>
              <p className="mt-1 text-2xl font-semibold">Standard</p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
};
