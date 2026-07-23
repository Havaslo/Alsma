import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Gift, LogOut, Mail, Phone, Printer } from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { Form } from "@/components/Form";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Loader } from "@/components/ui/Loader";
import { completeGuestProfile, logoutGuest } from "@/lib/auth/guest-auth-api";
import { writeGuestSession } from "@/lib/auth/session";
import { GUEST_PROFILE_QUERY_KEY, useGuestAuth } from "@/lib/auth/useGuestAuth";

export const AccountPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useGuestAuth();
  const guest = auth.data?.guest;
  const [section, setSection] = useState<"bookings" | "loyalty">("bookings");
  const profileForm = useForm({ defaultValues: { fullName: "" } });
  const profileMutation = useMutation({
    mutationFn: completeGuestProfile,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: GUEST_PROFILE_QUERY_KEY }),
  });
  if (auth.isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-page">
        <Loader className="text-brand" size="lg" />
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
          <Form
            className="mt-7 space-y-4"
            form={profileForm}
            onSubmit={(values) => profileMutation.mutate(values)}
          >
            <input
              className="w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-focus"
              placeholder="Ваше имя"
              {...profileForm.register("fullName", { required: true })}
            />
            <button
              className="w-full rounded-full bg-brand px-5 py-4 font-semibold text-brand-foreground"
              type="submit"
            >
              Продолжить
            </button>
          </Form>
        </section>
      </main>
    );
  const logout = async () => {
    await logoutGuest().catch(() => undefined);
    writeGuestSession(null);
    queryClient.clear();
    navigate(AMAZI_ROUTES.home);
  };
  return (
    <main className="min-h-screen bg-page px-4 pt-32 pb-20">
      <SiteHeader light />
      <div className="mx-auto max-w-7xl">
        <section className="flex flex-col justify-between gap-6 rounded-4xl border border-line bg-panel p-7 shadow-xl sm:flex-row sm:items-center">
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
        <nav className="mt-10 flex flex-wrap gap-3">
          <button
            className={
              section === "bookings"
                ? "rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
                : "rounded-full border border-line bg-panel px-6 py-3 font-semibold text-brand"
            }
            onClick={() => setSection("bookings")}
            type="button"
          >
            История бронирований
          </button>
          <button
            className={
              section === "loyalty"
                ? "rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
                : "rounded-full border border-line bg-panel px-6 py-3 font-semibold text-brand"
            }
            onClick={() => setSection("loyalty")}
            type="button"
          >
            Бонусы и скидки
          </button>
        </nav>
        {section === "bookings" ? (
          <section className="mt-8">
            <div className="flex items-center gap-3">
              <CalendarDays className="size-7 text-brand" />
              <h2 className="font-heading text-3xl font-semibold text-brand">
                История бронирований
              </h2>
            </div>
            <div className="mt-6 space-y-5">
              {guest.bookings.map((booking) => (
                <article
                  className="rounded-4xl border border-line bg-panel p-6 sm:p-8"
                  key={booking.id}
                >
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-brand">
                        {booking.roomName}
                      </h3>
                      <p className="mt-2 text-sm text-muted-ui-foreground">
                        Номер брони: {booking.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-page px-5 py-3 font-semibold text-brand"
                      onClick={() => window.print()}
                      type="button"
                    >
                      <Printer className="size-4" /> Распечатать
                    </button>
                  </div>
                  <dl className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
                        Заезд
                      </dt>
                      <dd className="mt-2 font-semibold">
                        {new Date(booking.checkInDate).toLocaleDateString(
                          "ru-RU",
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
                        Выезд
                      </dt>
                      <dd className="mt-2 font-semibold">
                        {new Date(booking.checkOutDate).toLocaleDateString(
                          "ru-RU",
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
                        Гости
                      </dt>
                      <dd className="mt-2 font-semibold">
                        {booking.guestsCount} гост.
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
                        Итоговая цена
                      </dt>
                      <dd className="mt-2 font-semibold text-brand">
                        {booking.totalAmount
                          ? `${Number(booking.totalAmount).toLocaleString("ru-RU")} ₽`
                          : "По запросу"}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-7 w-fit rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
                    {booking.status}
                  </p>
                </article>
              ))}
              {!guest.bookings.length && (
                <div className="rounded-3xl bg-panel p-8 text-muted-ui-foreground">
                  Активных бронирований пока нет.
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="mt-8 max-w-2xl">
            <article className="rounded-3xl border border-line bg-panel p-6">
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
                <p className="mt-1 text-2xl font-semibold">
                  {guest.bonusProgram?.level ?? "Standard"}
                </p>
                <p className="mt-2 text-sm opacity-80">
                  {guest.bonusProgram?.balance ?? 0} бонусов
                </p>
              </div>
            </article>
          </section>
        )}
      </div>
    </main>
  );
};
