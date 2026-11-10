import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import {
  completeVkPhotoManualConnection,
  loadVkPhotoConnection,
  startVkPhotoManualConnection,
} from "@/lib/content-factory/vkPhotoConnectionApi";

export const VkPhotoAccessButton = ({ className }: { className?: string }) => {
  const client = useQueryClient();
  const [callback, setCallback] = useState("");
  const [message, setMessage] = useState("");
  const access = useQuery({
    queryKey: ["content-factory", "vk-photo-connection"],
    queryFn: ({ signal }) => loadVkPhotoConnection(signal),
    refetchInterval: 15_000,
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
  const error = start.error ?? complete.error;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Button
        variant="secondary"
        disabled={
          !access.data?.legacyConfigured ||
          start.isPending ||
          complete.isPending
        }
        onClick={() => start.mutate()}
      >
        {start.isPending ? "Готовим подключение…" : "Обновить доступ"}
      </Button>
      {start.data && (
        <div className="min-w-0 space-y-3">
          <a
            href={start.data}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm underline"
          >
            Открыть VK и подтвердить доступ
          </a>
          <label className="block space-y-2 text-sm">
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
      {message && (
        <p className="text-sm" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-rose-700" role="alert">
          {contentFactoryErrorMessage(
            error,
            "Не удалось проверить VK. Повторите позже.",
          )}
        </p>
      )}
    </div>
  );
};
