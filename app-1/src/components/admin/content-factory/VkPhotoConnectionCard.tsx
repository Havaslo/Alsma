import { useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import {
  completeVkPhotoManualConnection,
  loadVkPhotoConnection,
  startVkIdPhotoConnection,
  startVkPhotoConnection,
  startVkPhotoManualConnection,
} from "@/lib/content-factory/vkPhotoConnectionApi";

const messages: Record<string, string> = {
  VKID_INVALID_SCOPE:
    "Приложению VK ID недоступен запрошенный доступ photos. Проверьте разрешения приложения VK ID; legacy-подключение сохранено.",
  VKID_INVALID_GRANT:
    "VK ID отклонил одноразовый код. Начните подключение заново.",
  VKID_INVALID_CLIENT:
    "VK ID отклонил приложение. Проверьте ID и настройки приложения.",
  VKID_INVALID_REQUEST:
    "VK ID отклонил параметры входа. Проверьте зарегистрированный адрес возврата.",
  VKID_CONNECTED:
    "Доступ к фото и обновление токена проверены. Сервер будет обновлять доступ автоматически.",
  VKID_PHOTOS_NOT_GRANTED:
    "VK ID не выдал права на фотографии. Прежнее подключение сохранено.",
  VKID_CONNECTION_DENIED:
    "VK ID не подтвердил загрузку фото или обновление токена. Прежнее подключение сохранено.",
  VKID_CODE_MISSING:
    "VK ID не вернул данные для завершения входа. Начните подключение заново.",
  VKID_REFRESH_FAILED:
    "VK ID не смог обновить доступ к фото. Повторите проверку; если разрешение отозвано, подключите аккаунт снова.",
  VKID_RECONNECT_REQUIRED:
    "Настройки приложения VK ID изменились. Подключите фотографии снова.",
  CONNECTED:
    "Доступ к загрузке фото подтверждён. Можно планировать публикации.",
  INVALID_CALLBACK:
    "Вставьте полный адрес страницы oauth.vk.com/blank.html или oauth.vk.ru/blank.html после подтверждения доступа.",
  TOKEN_INSTEAD_OF_CODE:
    "VK вернул токен вместо кода. Начните подключение по ссылке из этого блока; старый браузерный токен сюда не подходит.",
  IP_MISMATCH:
    "VK отклонил доступ из-за другого IP сервера. Требуется проверить исходящий адрес и способ авторизации приложения.",
  EXPIRED: "Срок доступа к фотографиям истёк. Подключите VK снова.",
  INVALID_SESSION: "VK отклонил сессию. Подключите фотографии снова.",
  INVALID_STATE:
    "Ссылка подключения устарела или уже использована. Начните подключение заново.",
  AUTHORIZATION_DENIED: "Подключение отменено. Прежний доступ сохранён.",
  CODE_EXCHANGE_DENIED:
    "VK не выдал серверный ключ. Проверьте тип приложения, доступность серверной авторизации и адрес возврата в кабинете VK.",
  PHOTO_ACCESS_DENIED:
    "VK не разрешил серверу загружать фото. Требуется проверить разрешение photos и права аккаунта в сообществе.",
  AUTH_FAILED:
    "VK не принял пользовательский доступ. Переподключите фотографии.",
};

export const VkPhotoConnectionCard = () => {
  const status = useQuery({
    queryKey: ["content-factory", "vk-photo-connection"],
    queryFn: ({ signal }) => loadVkPhotoConnection(signal),
    staleTime: 15_000,
  });
  const connect = useMutation({
    mutationFn: startVkIdPhotoConnection,
    onSuccess: (url) => window.location.assign(url),
  });
  const legacyConnect = useMutation({
    mutationFn: startVkPhotoConnection,
    onSuccess: (url) => window.location.assign(url),
  });
  const [callbackUrl, setCallbackUrl] = useState("");
  const [manualResult, setManualResult] = useState<string | null>(null);
  const manualStart = useMutation({
    mutationFn: startVkPhotoManualConnection,
    onSuccess: () => {
      setCallbackUrl("");
      setManualResult(null);
    },
  });
  const manualComplete = useMutation({
    mutationFn: completeVkPhotoManualConnection,
    onSuccess: (result) => {
      setManualResult(result);
      setCallbackUrl("");
      void status.refetch();
    },
  });
  const outcome = new URLSearchParams(window.location.search).get(
    "vkPhotoConnection",
  );
  const message =
    outcome && outcome !== "CONNECTED"
      ? messages[outcome]
      : status.data?.photoReady
        ? null
        : messages[status.data?.reason ?? ""];
  return (
    <section
      id="vk-photo-connection"
      className="space-y-3 rounded-3xl border border-line bg-brand-foreground p-5"
    >
      <h2 className="font-semibold text-page-foreground">
        Фотографии для публикаций VK
      </h2>
      <p className="text-sm text-muted-ui-foreground">
        {status.data?.activeSource === "vkid" && status.data.photoReady
          ? "VK ID подключён. Сервер автоматически обновляет доступ к фотографиям. Открытая вкладка не требуется."
          : status.data?.activeSource === "legacy"
            ? "Используется устаревшее подключение без серверного автообновления. Подключите VK ID."
            : "Подключите VK ID администратора сообщества. Доступ станет активным после проверки фотографий и реального обновления токена."}
      </p>
      <p className="text-sm text-muted-ui-foreground">
        Источник: {status.data?.activeSource ?? "не подключён"}. Текущий токен
        действует до:{" "}
        {status.data?.expiresAt
          ? new Date(status.data.expiresAt).toLocaleString("ru-RU")
          : "—"}
        . Последнее обновление:{" "}
        {status.data?.vkId?.lastRefreshAt
          ? new Date(status.data.vkId.lastRefreshAt).toLocaleString("ru-RU")
          : "—"}
        .
      </p>
      {status.data?.vkId?.lastAttempt && (
        <p role="status" className="text-sm">
          Последняя попытка: {status.data.vkId.lastAttempt.result}; этап:{" "}
          {status.data.vkId.lastAttempt.stage};{" "}
          {new Date(status.data.vkId.lastAttempt.at).toLocaleString("ru-RU")}.
        </p>
      )}
      {status.data?.vkId?.callbackUrl && (
        <p className="text-sm break-all">
          Адрес возврата, который должен быть зарегистрирован в VK ID:{" "}
          {status.data.vkId.callbackUrl}
        </p>
      )}
      {message && (
        <p className="text-sm text-amber-800" role="status">
          {message}
        </p>
      )}
      {(connect.error || status.error) && (
        <p className="text-sm text-rose-700" role="alert">
          {contentFactoryErrorMessage(
            connect.error ?? status.error,
            "Не удалось проверить подключение фото VK.",
          )}
        </p>
      )}
      <Button
        variant="secondary"
        disabled={!status.data?.vkId?.configured || connect.isPending}
        onClick={() => connect.mutate()}
      >
        {connect.isPending
          ? "Открываем VK…"
          : status.data?.photoReady
            ? "Переподключить фотографии VK"
            : "Подключить фотографии VK"}
      </Button>
      <details className="space-y-3 rounded-2xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Диагностика / устаревшее подключение
        </summary>
        <p className="text-sm text-muted-ui-foreground">
          Legacy-доступ может истекать через 24 часа и не поддерживает
          refresh_token. Это аварийный способ; серверного автообновления здесь
          нет.
        </p>
        <Button
          variant="secondary"
          disabled={!status.data?.legacyConfigured || legacyConnect.isPending}
          onClick={() => legacyConnect.mutate()}
        >
          Подключить legacy OAuth
        </Button>
        {legacyConnect.error && (
          <p role="alert">
            {contentFactoryErrorMessage(
              legacyConnect.error,
              "Не удалось подключить legacy OAuth.",
            )}
          </p>
        )}
        <Button
          variant="secondary"
          disabled={
            !status.data?.legacyConfigured ||
            manualStart.isPending ||
            manualComplete.isPending
          }
          onClick={() => manualStart.mutate(false)}
        >
          {manualStart.isPending
            ? "Готовим ссылку…"
            : "Начать подключение без callback"}
        </Button>
        {manualStart.data && (
          <div className="space-y-3">
            <p className="text-sm">
              <a
                className="underline"
                href={manualStart.data}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть VK и разрешить доступ к фотографиям
              </a>
            </p>
            <p className="text-sm text-muted-ui-foreground">
              После подтверждения скопируйте полный адрес из адресной строки VK
              и вставьте ниже. Ссылка действует 10 минут. Если VK показывает
              ошибку, подключение пока недоступно — сохраните текст ошибки.
            </p>
            <label className="block space-y-1 text-sm">
              <span>Адрес страницы после подтверждения VK</span>
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-line bg-transparent px-3 py-2"
                value={callbackUrl}
                onChange={(event) => setCallbackUrl(event.target.value)}
                maxLength={8192}
              />
            </label>
            <Button
              variant="secondary"
              disabled={
                !callbackUrl.trim() ||
                manualComplete.isPending ||
                manualStart.isPending
              }
              onClick={() => manualComplete.mutate(callbackUrl.trim())}
            >
              {manualComplete.isPending
                ? "Проверяем доступ…"
                : "Подтвердить подключение"}
            </Button>
          </div>
        )}
        {manualResult && (
          <p role="status" className="text-sm">
            {messages[manualResult] ??
              "VK не подтвердил подключение. Начните заново."}
          </p>
        )}
        {(manualStart.error || manualComplete.error) && (
          <p role="alert" className="text-sm text-rose-700">
            {contentFactoryErrorMessage(
              manualStart.error ?? manualComplete.error,
              "Не удалось завершить подключение VK.",
            )}
          </p>
        )}
      </details>
    </section>
  );
};
