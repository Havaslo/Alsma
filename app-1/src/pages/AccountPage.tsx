import { useState } from "react";
import { useForm } from "react-hook-form";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { LogOut, Mail, Phone } from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { Form } from "@/components/Form";
import { AccountBookingsSection } from "@/components/account/AccountBookingsSection";
import { AccountLoyaltySection } from "@/components/account/AccountLoyaltySection";
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
    navigate({ to: AMAZI_ROUTES.home });
  };

  return (
    <main className="min-h-screen bg-page px-4 pt-32 pb-20">
      <SiteHeader light />
      <div className="mx-auto max-w-7xl">
        <section className="flex flex-col justify-between gap-6 rounded-4xl border border-line bg-panel p-7 sm:flex-row sm:items-center">
          <div className="flex items-center gap-5">
            <div className="grid size-20 place-items-center rounded-full bg-page text-3xl font-semibold text-brand">
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
          {[
            ["bookings", "История бронирований"],
            ["loyalty", "Бонусы и скидки"],
          ].map(([value, label]) => (
            <button
              className={
                section === value
                  ? "rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
                  : "rounded-full border border-line bg-panel px-6 py-3 font-semibold text-brand"
              }
              key={value}
              onClick={() => setSection(value as "bookings" | "loyalty")}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
        {section === "bookings" ? (
          <AccountBookingsSection bookings={guest.bookings} />
        ) : (
          <AccountLoyaltySection bonusProgram={guest.bonusProgram} />
        )}
      </div>
    </main>
  );
};
