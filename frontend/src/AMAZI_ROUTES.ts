/** User-facing paths consumed by both React Router and the Amazi preview navigation. */
export const AMAZI_ROUTES = {
  account: "/account",
  accountSetupName: "/account/setup-name",
  admin: "/admin",
  adminAgentScenarios: "/admin/agent-scenarios",
  adminBookingRequests: "/admin/booking-requests",
  adminClient: "/admin/clients/:clientId",
  adminClients: "/admin/clients",
  adminDashboard: "/admin/dashboard",
  adminIntegrations: "/admin/integrations",
  adminKnowledgeBase: "/admin/knowledge-base",
  adminLogin: "/admin/login",
  adminRequest: "/admin/requests/:requestId",
  adminRequests: "/admin/requests",
  adminSettings: "/admin/settings",
  adminSiteLeads: "/admin/site-leads",
  adminSiteManagement: "/admin/site-management",
  adminSiteManagementSection: "/admin/site-management/:sectionId",
  allInclusive: "/all-inclusive",
  about: "/about",
  blog: "/blog",
  celebrations: "/celebrations",
  entertainment: "/entertainment",
  hardwareProcedures: "/hardware-procedures",
  home: "/",
  login: "/login",
  news: "/news",
  offers: "/offers",
  privacy: "/privacy",
  rooms: "/rooms",
  spa: "/spa",
} as const;

/** Legacy admin paths rendered by the consolidated dashboard. */
export const AMAZI_ADMIN_DASHBOARD_ROUTES = [
  AMAZI_ROUTES.admin,
  AMAZI_ROUTES.adminAgentScenarios,
  AMAZI_ROUTES.adminBookingRequests,
  AMAZI_ROUTES.adminClients,
  AMAZI_ROUTES.adminClient,
  AMAZI_ROUTES.adminIntegrations,
  AMAZI_ROUTES.adminKnowledgeBase,
  AMAZI_ROUTES.adminRequests,
  AMAZI_ROUTES.adminRequest,
  AMAZI_ROUTES.adminSettings,
  AMAZI_ROUTES.adminSiteLeads,
  AMAZI_ROUTES.adminSiteManagement,
  AMAZI_ROUTES.adminSiteManagementSection,
] as const;

/** Non-navigable fallback kept outside the preview route catalog. */
export const AMAZI_FALLBACK_ROUTE = "*" as const;
