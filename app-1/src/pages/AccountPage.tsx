import { useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { LogOut, Mail, Phone } from "lucide-react";

import { AccountServicesSection } from "@/components/account/AccountServicesSection";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Loader } from "@/components/ui/Loader";
import { logoutGuest } from "@/lib/auth/guest-auth-api";
import { writeGuestSession } from "@/lib/auth/session";
import { useGuestAuth } from "@/lib/auth/useGuestAuth";
import { ROUTES } from "@/route-constants";

export const AccountPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useGuestAuth();
  const guest = auth.data?.guest;
  if (auth.isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-page">
        <Loader className="text-brand" size="lg" />
      </main>
    );
  if (!guest) return <Navigate replace to={ROUTES.login} />;
  const logout = async () => {
    await logoutGuest().catch(() => undefined);
    writeGuestSession(null);
    queryClient.clear();
    navigate({ to: ROUTES.home });
  };

  return (
    <main className="min-h-screen bg-page px-4 pt-24 pb-20 sm:pt-32">
      <SiteHeader light />
      <div className="mx-auto max-w-[100rem]">
        <section className="flex flex-col justify-between gap-6 rounded-4xl border border-line bg-panel p-7 sm:flex-row sm:items-center">
          <div className="flex items-center gap-5">
            <div className="grid size-20 place-items-center rounded-full bg-page text-3xl font-semibold text-brand">
              {guest.fullName?.[0] || "Г"}
            </div>
            <div>
              <h1 className="font-heading text-4xl font-semibold text-brand">
                {guest.fullName || "Гость"}
              </h1>
              <div className="mt-3 space-y-1 text-sm text-muted-ui-foreground">
                {guest.phone && !guest.phone.startsWith("email:") && (
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
        <AccountServicesSection serviceOrders={guest.serviceOrders} />
      </div>
    </main>
  );
};
