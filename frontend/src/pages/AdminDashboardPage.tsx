import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { AdminAgentScenariosPanel } from "@/components/admin/AdminAgentScenariosPanel";
import { AdminDashboardOverview } from "@/components/admin/AdminDashboardOverview";
import { AdminIntegrationsPanel } from "@/components/admin/AdminIntegrationsPanel";
import { AdminKnowledgeBasePanel } from "@/components/admin/AdminKnowledgeBasePanel";
import {
  AdminOperationsPanel,
  type AdminOperationsTab,
} from "@/components/admin/AdminOperationsPanel";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSiteContentEditor } from "@/components/admin/AdminSiteContentEditor";
import { AdminSiteLeadsTable } from "@/components/admin/AdminSiteLeadsTable";
import { Loader } from "@/components/ui/Loader";
import { logoutAdmin } from "@/lib/admin/admin-api";
import { writeAdminSession } from "@/lib/admin/admin-session";
import { useAdmin } from "@/lib/admin/useAdmin";
import { queryClient } from "@/lib/query/query-client";

export const AdminDashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const admin = useAdmin();
  const path = location.pathname;
  const permissions = admin.data?.user.permissions ?? [];
  const can = (permission: string) =>
    permissions.includes("*") || permissions.includes(permission);

  if (admin.isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-page">
        <Loader className="text-brand" size="lg" />
      </main>
    );
  if (!admin.data?.user)
    return <Navigate replace to={AMAZI_ROUTES.adminLogin} />;

  const isDashboard =
    path === AMAZI_ROUTES.admin || path === AMAZI_ROUTES.adminDashboard;
  const isSiteLeads = path === AMAZI_ROUTES.adminSiteLeads;
  const operationTab: AdminOperationsTab | null =
    path === AMAZI_ROUTES.adminBookingRequests
      ? "bookings"
      : path.startsWith(AMAZI_ROUTES.adminClients)
        ? "clients"
        : path.startsWith("/admin/requests")
          ? "requests"
          : null;

  const logout = async () => {
    await logoutAdmin().catch(() => undefined);
    writeAdminSession(null);
    queryClient.clear();
    navigate(AMAZI_ROUTES.adminLogin);
  };

  return (
    <AdminShell
      onLogout={() => void logout()}
      path={path}
      user={admin.data.user}
    >
      {isDashboard && can("dashboard.access") && <AdminDashboardOverview />}
      {isSiteLeads && can("leads.access") && <AdminSiteLeadsTable />}
      {(can("dashboard.access") || can("requests.access")) && operationTab && (
        <AdminOperationsPanel
          initialTab={operationTab}
          key={operationTab}
          showTabs={false}
        />
      )}
      {path === AMAZI_ROUTES.adminKnowledgeBase && can("knowledge.manage") && (
        <AdminKnowledgeBasePanel />
      )}
      {path === AMAZI_ROUTES.adminAgentScenarios && can("scenarios.access") && (
        <AdminAgentScenariosPanel />
      )}
      {path === AMAZI_ROUTES.adminSettings && can("settings.access") && (
        <AdminSettingsPanel currentUserId={admin.data.user.id} />
      )}
      {(path === AMAZI_ROUTES.adminSiteManagement ||
        path.startsWith(`${AMAZI_ROUTES.adminSiteManagement}/`)) &&
        can("site.manage") && <AdminSiteContentEditor />}
      {path === AMAZI_ROUTES.adminIntegrations &&
        can("integrations.access") && <AdminIntegrationsPanel />}
    </AdminShell>
  );
};
