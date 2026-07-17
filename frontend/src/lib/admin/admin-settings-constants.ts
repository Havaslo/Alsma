import type { AdminPermission } from "@/lib/admin/admin-settings-api";

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  "content.delete": "Удаление контента",
  "dashboard.access": "Обзор",
  "integrations.access": "Интеграции",
  "knowledge.manage": "База знаний",
  "leads.access": "Лиды сайта",
  "requests.access": "Заявки",
  "scenarios.access": "Сценарии агента",
  "settings.access": "Настройки",
  "site.manage": "Управление сайтом",
};
