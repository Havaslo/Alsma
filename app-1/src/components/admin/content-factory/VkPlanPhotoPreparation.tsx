import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import {
  completeVkPhotoManualConnection,
  loadVkPhotoConnection,
  startVkPhotoManualConnection,
} from "@/lib/content-factory/vkPhotoConnectionApi";

export const VkPlanPhotoPreparation = () => {
  const client = useQueryClient();
  const [callback, setCallback] = useState("");
  const [message, setMessage] = useState("");
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
          generatingPosts: number;
        }>("/admin/content-factory/plan/photos/status", {
          signal,
          headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` },
        })
      ).data,
    refetchInterval: 10_000,
  });
  const start = useMutation({
    mutationFn: () => startVkPhotoManualConnection(false),
    onSuccess: () => {
      setCallback("");
      setMessage("");
    },
  });
  const complete = useMutation({
    mutationFn: () => completeVkPhotoManualConnection(callback),
    onSuccess: (result) => {
      setCallback("");
      setMessage(
        result === "CONNECTED"
          ? "Доступ обновлён. Сервер начнёт подготовку оставшихся фотографий автоматически."
          : `VK не подтвердил подключение (${result}). Начните подключение заново.`,
      );
      void client.invalidateQueries({
        queryKey: ["content-factory", "vk-photo-connection"],
      });
      void client.invalidateQueries({
        queryKey: ["content-factory", "vk-photo-preparation"],
      });
    },
  });
  const error =
    access.error ?? preparation.error ?? start.error ?? complete.error;
  return (
    <div className="space-y-4 text-sm">
      <p>
        Фотографии контент-плана заранее загружаются в VK, пока действует
        доступ. После подготовки публикации по расписанию используют сохранённые
        вложения, даже если срок этого доступа истёк.
      </p>
      <p role="status">
        {access.isPending
          ? "Проверяем доступ VK…"
          : access.data?.photoReady
            ? "Доступ к загрузке фотографий активен."
            : "Для загрузки новых фотографий обновите доступ VK."}
        {access.data?.expiresAt &&
          ` Действует до ${new Date(access.data.expiresAt).toLocaleString("ru-RU")}.`}
      </p>
      {preparation.data && (
        <p role="status">
          Подготовлено фотографий в текущих планах: {preparation.data.ready} из{" "}
          {preparation.data.total}. Осталось: {preparation.data.pending}.
          {preparation.data.failed > 0 &&
            ` Не удалось подготовить: ${preparation.data.failed}. После обновления доступа сервер повторит загрузку.`}
          {!preparation.data.enabled &&
            " Автоматическая подготовка включается на основном сайте при настроенном VK."}
        </p>
      )}
      <p className="text-muted-ui-foreground">
        Новые и заменённые фото требуют действующего доступа. Закрывать сайт
        можно: подготовка продолжится на сервере. Посты выходят только после
        одобрения и постановки в расписание.
      </p>
      <Button
        variant="secondary"
        disabled={
          !access.data?.legacyConfigured ||
          start.isPending ||
          complete.isPending
        }
        onClick={() => start.mutate()}
      >
        {start.isPending
          ? "Готовим подключение…"
          : "Обновить доступ к фотографиям"}
      </Button>
      {start.data && (
        <div className="space-y-3">
          <a
            href={start.data}
            target="_blank"
            rel="noopener noreferrer"
            className="block underline"
          >
            Открыть VK и подтвердить доступ
          </a>
          <label className="block space-y-2">
            <span>После подтверждения вставьте полный адрес страницы VK</span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={callback}
              onChange={(event) => setCallback(event.target.value)}
              className="w-full rounded-xl border border-line p-3"
            />
          </label>
          <Button
            disabled={!callback.trim() || complete.isPending}
            onClick={() => complete.mutate()}
          >
            {complete.isPending ? "Проверяем…" : "Сохранить доступ"}
          </Button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="text-rose-700">
          {contentFactoryErrorMessage(
            error,
            "Не удалось проверить VK. Повторите позже.",
          )}
        </p>
      )}
    </div>
  );
};
