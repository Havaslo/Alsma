import { useQuery } from "@tanstack/react-query";

import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import { loadVkPhotoConnection } from "@/lib/content-factory/vkPhotoConnectionApi";

import { VkPhotoAccessButton } from "./VkPhotoAccessButton";

const formatExpiry = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  });

export const VkPlanPhotoPreparation = ({
  showAction = true,
}: {
  showAction?: boolean;
}) => {
  const access = useQuery({
    queryKey: ["content-factory", "vk-photo-connection"],
    queryFn: ({ signal }) => loadVkPhotoConnection(signal),
    refetchInterval: 15_000,
  });
  const preparation = useQuery({
    queryKey: ["content-factory", "vk-photo-preparation"],
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<{
          enabled: boolean;
          total: number;
          ready: number;
          pending: number;
          failed: number;
          errors?: { imageId: string; fileName: string; message: string }[];
          generatingPosts: number;
        }>("/admin/content-factory/plan/photos/status", {
          signal,
          headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` },
        })
      ).data,
    refetchInterval: 10_000,
  });
  const error = access.error ?? preparation.error;
  const data = preparation.data;
  const preparationSummary = (() => {
    if (!data) return null;
    if (!data.enabled) return "Автоматическая подготовка фотографий выключена.";
    const parts: string[] = [];
    if (data.pending > 0) parts.push(`Осталось подготовить: ${data.pending}.`);
    if (data.failed > 0)
      parts.push(`С ошибкой: ${data.failed} — повторяем автоматически.`);
    if (data.generatingPosts > 0)
      parts.push(
        `Ещё создаются посты: ${data.generatingPosts}. Их фото подготовим после генерации.`,
      );
    if (parts.length > 0) return parts.join(" ");
    if (data.total === 0) return "Фотографий для подготовки пока нет.";
    return "Все фотографии готовы.";
  })();
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-ui-foreground" role="status">
        {access.isPending
          ? "Проверяем доступ VK…"
          : access.data?.photoReady
            ? access.data.expiresAt
              ? `Доступ активен до ${formatExpiry(access.data.expiresAt)}.`
              : "Доступ активен."
            : "Доступ не активен — обновите его, чтобы загружать новые фотографии."}
      </p>
      {preparationSummary && (
        <p className="text-muted-ui-foreground" role="status">
          {preparationSummary}
        </p>
      )}
      {preparation.data?.errors?.length ? (
        <ul className="space-y-2 text-sm text-amber-900" role="status">
          {preparation.data.errors.map((error) => (
            <li key={error.imageId} className="break-words">
              <strong>{error.fileName}:</strong> {error.message}
            </li>
          ))}
        </ul>
      ) : null}
      {showAction && <VkPhotoAccessButton />}
      {error && (
        <p role="alert" className="text-rose-700">
          {contentFactoryErrorMessage(
            error,
            "Не удалось проверить VK. Повторите позже.",
          )}
        </p>
      )}
      {data && data.pending + data.failed > 0 && (
        <p className="text-xs text-muted-ui-foreground">
          Закрывать сайт можно — подготовка идёт на сервере.
        </p>
      )}
    </div>
  );
};
