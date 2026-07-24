import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { AdminAgentScenariosPanel } from "@/components/admin/AdminAgentScenariosPanel";
import { AdminBookingRequestsPanel } from "@/components/admin/AdminBookingRequestsPanel";
import { AdminClientsPanel } from "@/components/admin/AdminClientsPanel";
import { AdminDashboardOverview } from "@/components/admin/AdminDashboardOverview";
import { AdminHomeEditor } from "@/components/admin/AdminHomeEditor";
import { AdminIntegrationsPanel } from "@/components/admin/AdminIntegrationsPanel";
import { AdminKnowledgeBasePanel } from "@/components/admin/AdminKnowledgeBasePanel";
import { AdminRequestsPanel } from "@/components/admin/AdminRequestsPanel";
import { AdminRoomsEditor } from "@/components/admin/AdminRoomsEditor";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSiteLeadsTable } from "@/components/admin/AdminSiteLeadsTable";
import { AdminSitePlaceholder } from "@/components/admin/AdminSitePlaceholder";
import { getAdminSiteTitle } from "@/components/admin/admin-site-navigation";
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
  const isSiteManagement = path.startsWith(AMAZI_ROUTES.adminSiteManagement);

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
      {path === AMAZI_ROUTES.adminBookingRequests &&
        can("dashboard.access") && <AdminBookingRequestsPanel />}
      {path.startsWith(AMAZI_ROUTES.adminClients) &&
        can("dashboard.access") && <AdminClientsPanel />}
      {path.startsWith("/admin/requests") && can("requests.access") && (
        <AdminRequestsPanel />
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
      {path === AMAZI_ROUTES.adminSiteManagementHome && can("site.manage") && (
        <AdminHomeEditor />
      )}
      {path === AMAZI_ROUTES.adminSiteManagementRooms && can("site.manage") && (
        <AdminRoomsEditor />
      )}
      {isSiteManagement &&
        path !== AMAZI_ROUTES.adminSiteManagementHome &&
        path !== AMAZI_ROUTES.adminSiteManagementRooms &&
        can("site.manage") && (
          <AdminSitePlaceholder title={getAdminSiteTitle(path)} />
        )}
      {path === AMAZI_ROUTES.adminIntegrations &&
        can("integrations.access") && <AdminIntegrationsPanel />}
    </AdminShell>
  );
};
