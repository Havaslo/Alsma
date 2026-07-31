import { Navigate, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { AdminAgentScenariosPanel } from "@/components/admin/AdminAgentScenariosPanel";
import { AdminBookingRequestsPanel } from "@/components/admin/AdminBookingRequestsPanel";
import { AdminClientDetail } from "@/components/admin/AdminClientDetail";
import { AdminClientsPanel } from "@/components/admin/AdminClientsPanel";
import { AdminDashboardOverview } from "@/components/admin/AdminDashboardOverview";
import { AdminEntertainmentEditor } from "@/components/admin/AdminEntertainmentEditor";
import { AdminHomeEditor } from "@/components/admin/AdminHomeEditor";
import { AdminIntegrationsPanel } from "@/components/admin/AdminIntegrationsPanel";
import { AdminKnowledgeBasePanel } from "@/components/admin/AdminKnowledgeBasePanel";
import { AdminNewsEditor } from "@/components/admin/AdminNewsEditor";
import { AdminOffersEditor } from "@/components/admin/AdminOffersEditor";
import { AdminRequestDetail } from "@/components/admin/AdminRequestDetail";
import { AdminRequestsPanel } from "@/components/admin/AdminRequestsPanel";
import { AdminRoomsEditor } from "@/components/admin/AdminRoomsEditor";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSiteLeadsTable } from "@/components/admin/AdminSiteLeadsTable";
import { AdminSitePlaceholder } from "@/components/admin/AdminSitePlaceholder";
import { AdminSpaEditor } from "@/components/admin/AdminSpaEditor";
import { getAdminSiteTitle } from "@/components/admin/admin-site-navigation";
import { Loader } from "@/components/ui/Loader";
import { logoutAdmin } from "@/lib/admin/admin-api";
import { writeAdminSession } from "@/lib/admin/admin-session";
import { useAdmin } from "@/lib/admin/useAdmin";
import { queryClient } from "@/lib/query/query-client";
import { ROUTES } from "@/route-constants";

export const AdminDashboardPage = () => {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const admin = useAdmin();
  const permissions = admin.data?.user.permissions ?? [];
  const can = (permission: string) => permissions.includes("*") || permissions.includes(permission);
  if (admin.isLoading) return <main className="grid min-h-screen place-items-center bg-page"><Loader className="text-brand" size="lg" /></main>;
  if (!admin.data?.user) return <Navigate replace to={ROUTES.adminLogin} />;
  const isDashboard = path === ROUTES.admin || path === ROUTES.adminDashboard;
  const isSiteLeads = path === ROUTES.adminSiteLeads;
  const isSiteManagement = path.startsWith(ROUTES.adminSiteManagement);
  const logout = async () => { await logoutAdmin().catch(() => undefined); writeAdminSession(null); queryClient.clear(); navigate({ to: ROUTES.adminLogin }); };
  return <AdminShell onLogout={() => void logout()} path={path} user={admin.data.user}>
    {isDashboard && can("dashboard.access") && <AdminDashboardOverview />}
    {isSiteLeads && can("leads.access") && <AdminSiteLeadsTable />}
    {path === ROUTES.adminBookingRequests && can("dashboard.access") && <AdminBookingRequestsPanel />}
    {path === ROUTES.adminClients && can("dashboard.access") && <AdminClientsPanel />}
    {params.clientId && can("dashboard.access") && <AdminClientDetail clientId={params.clientId} />}
    {path === ROUTES.adminRequests && can("requests.access") && <AdminRequestsPanel />}
    {params.requestId && can("requests.access") && <AdminRequestDetail requestId={params.requestId} />}
    {path === ROUTES.adminKnowledgeBase && (can("knowledge.access") || can("knowledge.manage")) && <AdminKnowledgeBasePanel />}
    {path === ROUTES.adminAgentScenarios && can("scenarios.access") && <AdminAgentScenariosPanel />}
    {path === ROUTES.adminSettings && can("settings.access") && <AdminSettingsPanel currentUserId={admin.data.user.id} />}
    {path === ROUTES.adminSiteManagementHome && (can("site.access") || can("site.manage")) && <AdminHomeEditor />}
    {path === ROUTES.adminSiteManagementRooms && (can("site.access") || can("site.manage")) && <AdminRoomsEditor />}
    {path === ROUTES.adminSiteManagementSpa && (can("site.access") || can("site.manage")) && <AdminSpaEditor />}
    {path === ROUTES.adminSiteManagementEntertainment && (can("site.access") || can("site.manage")) && <AdminEntertainmentEditor />}
    {path === ROUTES.adminSiteManagementOffers && (can("site.access") || can("site.manage")) && <AdminOffersEditor />}
    {path === ROUTES.adminSiteManagementNews && (can("site.access") || can("site.manage")) && <AdminNewsEditor />}
    {isSiteManagement && ![ROUTES.adminSiteManagementHome, ROUTES.adminSiteManagementRooms, ROUTES.adminSiteManagementSpa, ROUTES.adminSiteManagementEntertainment, ROUTES.adminSiteManagementOffers, ROUTES.adminSiteManagementNews].includes(path as never) && (can("site.access") || can("site.manage")) && <AdminSitePlaceholder title={getAdminSiteTitle(path)} />}
    {path === ROUTES.adminIntegrations && can("integrations.access") && <AdminIntegrationsPanel />}
  </AdminShell>;
};
