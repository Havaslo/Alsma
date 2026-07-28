import type { AdminPermission } from "@/lib/admin/admin-settings-api";

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  "content.delete": "Удалять карточки, блоки, статьи и сценарии",
  "dashboard.access": "Дашборд",
  "integrations.access": "Интеграции",
  "knowledge.access": "База знаний",
  "knowledge.manage": "Редактировать базу знаний, сценарии и правила агентов",
  "leads.access": "Заявки сайта",
  "requests.access": "Обращения и клиенты",
  "scenarios.access": "Сценарии агента",
  "settings.access": "Настройки",
  "site.access": "Управление сайтом",
  "site.manage": "Заполнять контент в управлении сайтом",
};

export const ADMIN_SECTION_PERMISSIONS = [
  "dashboard.access",
  "site.access",
  "requests.access",
  "leads.access",
  "scenarios.access",
  "knowledge.access",
  "settings.access",
  "integrations.access",
] as const satisfies readonly AdminPermission[];

export const ADMIN_MECHANIC_PERMISSIONS = [
  "content.delete",
  "site.manage",
  "knowledge.manage",
] as const satisfies readonly AdminPermission[];
