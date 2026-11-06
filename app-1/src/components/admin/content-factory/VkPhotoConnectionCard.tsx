import { useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import {
  completeVkPhotoManualConnection,
  loadVkPhotoConnection,
  startVkPhotoConnection,
  startVkPhotoManualConnection,
} from "@/lib/content-factory/vkPhotoConnectionApi";

const messages: Record<string, string> = {
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
        {status.data?.photoReady
          ? "Загрузка фото подтверждена сервером."
          : "Для публикации новых фотографий подключите аккаунт администратора сообщества через VK."}
        {status.data?.photoReady &&
          status.data.expiresAt &&
          ` Доступ действует до ${new Date(status.data.expiresAt).toLocaleString("ru-RU")}. После этого потребуется повторное подключение.`}
      </p>
      {status.data && !status.data.configured && (
        <p className="text-sm text-amber-800">
          Нужно завершить настройку серверного подключения приложения VK в
          проекте. Обратитесь к администратору проекта.
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
        disabled={!status.data?.configured || connect.isPending}
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
          VK сообщает об ошибке redirect_uri?
        </summary>
        <p className="text-sm text-muted-ui-foreground">
          Можно проверить подключение через стандартную страницу VK. Оно
          сработает, только если VK разрешит этому приложению серверный доступ к
          фото. Один раз подтвердите разрешение и верните сюда адрес страницы.
        </p>
        <Button
          variant="secondary"
          disabled={
            !status.data?.configured ||
            manualStart.isPending ||
            manualComplete.isPending
          }
          onClick={() => manualStart.mutate(false)}
        >
          {manualStart.isPending
            ? "Готовим ссылку…"
            : "Начать подключение без callback"}
        </Button>
        <Button
          variant="secondary"
          disabled={
            !status.data?.configured ||
            manualStart.isPending ||
            manualComplete.isPending
          }
          onClick={() => manualStart.mutate(true)}
        >
          Запросить доступ без ежедневного входа
        </Button>
        <p className="text-sm text-muted-ui-foreground">
          Этот вариант запрашивает дополнительное разрешение offline. VK может
          отказать или ограничить срок; фактический результат появится после
          подключения. При отказе текущий доступ сохраняется.
        </p>
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
