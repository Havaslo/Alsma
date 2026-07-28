import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";

export const adminSiteNavigation = [
  {
    label: "Главная",
    to: AMAZI_ROUTES.adminSiteManagementHome,
  },
  {
    label: "Проживание",
    to: AMAZI_ROUTES.adminSiteManagementRooms,
  },
  {
    label: "SPA",
    to: AMAZI_ROUTES.adminSiteManagementSpa,
  },
  {
    label: "Развлечения",
    to: AMAZI_ROUTES.adminSiteManagementEntertainment,
  },
  {
    label: "Акции",
    to: AMAZI_ROUTES.adminSiteManagementOffers,
  },
  {
    label: "Новости",
    to: AMAZI_ROUTES.adminSiteManagementNews,
  },
  {
    label: "Блог",
    to: AMAZI_ROUTES.adminSiteManagementBlog,
  },
  {
    label: "Торжества",
    to: AMAZI_ROUTES.adminSiteManagementCelebrations,
  },
  {
    label: "Все включено",
    to: AMAZI_ROUTES.adminSiteManagementAllInclusive,
  },
  {
    label: "О нас",
    to: AMAZI_ROUTES.adminSiteManagementAbout,
  },
  {
    label: "Общее",
    to: AMAZI_ROUTES.adminSiteManagementGeneral,
  },
] as const;

export const getAdminSiteTitle = (path: string): string =>
  adminSiteNavigation.find(({ to }) => to === path)?.label ??
  "Управление сайтом";
