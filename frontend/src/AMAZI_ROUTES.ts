/** User-facing paths consumed by both React Router and the Amazi preview navigation. */
export const AMAZI_ROUTES = {
  account: "/account",
  adminDashboard: "/admin/dashboard",
  adminLogin: "/admin/login",
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

/** Non-navigable fallback kept outside the preview route catalog. */
export const AMAZI_FALLBACK_ROUTE = "*" as const;
