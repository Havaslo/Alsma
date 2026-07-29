import { ROUTES } from "@/route-constants";

export const adminSiteNavigation = [
  {
    label: "Главная",
    to: ROUTES.adminSiteManagementHome,
  },
  {
    label: "Проживание",
    to: ROUTES.adminSiteManagementRooms,
  },
  {
    label: "SPA",
    to: ROUTES.adminSiteManagementSpa,
  },
  {
    label: "Развлечения",
    to: ROUTES.adminSiteManagementEntertainment,
  },
  {
    label: "Акции",
    to: ROUTES.adminSiteManagementOffers,
  },
  {
    label: "Новости",
    to: ROUTES.adminSiteManagementNews,
  },
  {
    label: "Блог",
    to: ROUTES.adminSiteManagementBlog,
  },
  {
    label: "Торжества",
    to: ROUTES.adminSiteManagementCelebrations,
  },
  {
    label: "Все включено",
    to: ROUTES.adminSiteManagementAllInclusive,
  },
  {
    label: "О нас",
    to: ROUTES.adminSiteManagementAbout,
  },
  {
    label: "Общее",
    to: ROUTES.adminSiteManagementGeneral,
  },
] as const;

export const getAdminSiteTitle = (path: string): string =>
  adminSiteNavigation.find(({ to }) => to === path)?.label ??
  "Управление сайтом";
