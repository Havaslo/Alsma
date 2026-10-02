import { Navigate } from "@tanstack/react-router";

import { ContentFactoryWorkspace } from "@/components/admin/content-factory/ContentFactoryWorkspace";
import { Loader } from "@/components/ui/Loader";
import { useAdmin } from "@/lib/admin/useAdmin";
import { ROUTES } from "@/route-constants";

export const AdminContentFactoryPage = () => {
  const admin = useAdmin();
  const user = admin.data?.user;

  if (admin.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7f5]">
        <Loader className="text-emerald-800" size="lg" />
      </main>
    );
  }

  if (!user) return <Navigate replace to={ROUTES.adminLogin} />;

  const permissions = user.permissions ?? [];
  const canAccess =
    permissions.includes("*") ||
    permissions.includes("site.access") ||
    permissions.includes("site.manage");

  if (!canAccess) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7f5] px-4 text-slate-800">
        <section className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">
            Нет доступа к рабочему пространству
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Для открытия Фабрики контента требуется право доступа к управлению
            сайтом.
          </p>
        </section>
      </main>
    );
  }

  return <ContentFactoryWorkspace />;
};
