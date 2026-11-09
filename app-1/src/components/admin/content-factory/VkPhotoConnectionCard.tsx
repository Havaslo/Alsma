import { useEffect, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import {
  type BrowserRenewal,
  disabledRenewal,
  renewalStorageKey,
  restoreRenewal,
  shouldRenew,
} from "@/lib/content-factory/vkBrowserRenewal";
import {
  completeVkPhotoManualConnection,
  loadVkPhotoConnection,
  startVkIdPhotoConnection,
  startVkPhotoConnection,
  startVkPhotoManualConnection,
} from "@/lib/content-factory/vkPhotoConnectionApi";

const messages: Record<string, string> = {
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
  const [browserRenewal, setBrowserRenewal] = useState(() => {
    try {
      const restored = restoreRenewal(
        window.sessionStorage.getItem(renewalStorageKey),
        new URLSearchParams(window.location.search).get("vkPhotoConnection"),
        Date.now(),
      );
      window.sessionStorage.setItem(
        renewalStorageKey,
        JSON.stringify(restored),
      );
      return restored;
    } catch {
      return disabledRenewal();
    }
  });
  const [renewalError, setRenewalError] = useState<string | null>(null);
  const saveRenewal = (value: BrowserRenewal) => {
    window.sessionStorage.setItem(renewalStorageKey, JSON.stringify(value));
    setBrowserRenewal(value);
  };
  const status = useQuery({
    queryKey: ["content-factory", "vk-photo-connection"],
    queryFn: ({ signal }) => loadVkPhotoConnection(signal),
    staleTime: 15_000,
    refetchInterval: browserRenewal.enabled ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
  const browserConnect = useMutation({
    mutationFn: async () => {
      // Claim before the network call, so Back/reload cannot cause a redirect loop.
      saveRenewal({
        ...browserRenewal,
        enabled: true,
        pendingAt: Date.now(),
        attemptedExpiry: status.data?.expiresAt ?? null,
      });
      const current = new URL(window.location.href);
      current.searchParams.delete("vkPhotoConnection");
      window.history.replaceState(window.history.state, "", current);
      return startVkPhotoConnection();
    },
    onSuccess: (url) => window.location.assign(url),
    onError: () => {
      setBrowserRenewal(disabledRenewal());
      try {
        window.sessionStorage.removeItem(renewalStorageKey);
      } catch {
        /* Storage unavailable. */
      }
      setRenewalError(
        "Автопереподключение остановлено. Проверьте подключение вручную.",
      );
    },
  });
  const renew = browserConnect.mutateAsync;
  const renewalPending = browserConnect.isPending;
  useEffect(() => {
    if (!browserRenewal.enabled || !browserRenewal.verified) return;
    const check = () => {
      if (
        document.visibilityState !== "visible" ||
        renewalPending ||
        !status.data ||
        status.isError ||
        Date.now() - status.dataUpdatedAt > 90_000 ||
        !shouldRenew(browserRenewal, status.data, Date.now())
      )
        return;
      // Do not interrupt typing. The user opts in to navigation in this tab.
      if (
        document.activeElement?.matches("input,textarea,[contenteditable=true]")
      )
        return;
      if (!navigator.locks) return;
      void navigator.locks.request(
        "alsma-vk-browser-renewal",
        { ifAvailable: true },
        async (lock) => {
          if (!lock) return;
          try {
            const expiry = status.data!.expiresAt!;
            const claimKey = `${renewalStorageKey}-last-expiry`;
            if (window.localStorage.getItem(claimKey) === expiry) return;
            window.localStorage.setItem(claimKey, expiry);
            await renew();
          } catch {
            // No blind retry: a fresh manual connection is required after failure.
            setRenewalError(
              "Автопереподключение не выполнено. Подключите VK вручную.",
            );
          }
        },
      );
    };
    const timer = window.setInterval(check, 15_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [
    browserRenewal,
    renewalPending,
    renew,
    status.data,
    status.dataUpdatedAt,
    status.isError,
  ]);
  const connect = useMutation({
    mutationFn: startVkPhotoConnection,
    onSuccess: (url) => window.location.assign(url),
  });
  const vkIdConnect = useMutation({
    mutationFn: startVkIdPhotoConnection,
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
          ? "Аккаунт подключён. VK разрешил запросить адрес загрузки; отправка фото проверяется при публикации."
          : "Для публикации новых фотографий подключите аккаунт администратора сообщества через VK."}
        {status.data?.photoReady &&
          status.data.expiresAt &&
          ` Текущий доступ действует до ${new Date(status.data.expiresAt).toLocaleString("ru-RU")}. ${status.data.vkId?.autoRenewal ? "Сервер обновляет его автоматически перед использованием." : "После этого потребуется повторное подключение."}`}
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
      <div className="space-y-2 rounded-2xl border border-line p-4">
        <p className="text-sm text-muted-ui-foreground">
          Переподключение через эту вкладку:{" "}
          {browserRenewal.enabled && browserRenewal.verified
            ? "включено"
            : "выключено"}
          . После успешной проверки возврата из VK фабрика откроет авторизацию
          за 20 минут до истечения доступа. Работает только при открытой
          активной вкладке и может потребовать подтверждения VK. Перед
          включением сохраните изменения. Если VK отклоняет адрес возврата,
          сначала зарегистрируйте callback приложения.
        </p>
        <Button
          variant="secondary"
          disabled={
            !status.data?.configured ||
            browserConnect.isPending ||
            !navigator.locks
          }
          onClick={() => {
            setRenewalError(null);
            if (browserRenewal.enabled && browserRenewal.verified) {
              try {
                saveRenewal(disabledRenewal());
              } catch {
                setBrowserRenewal(disabledRenewal());
              }
            } else browserConnect.mutate();
          }}
        >
          {browserConnect.isPending
            ? "Открываем VK…"
            : browserRenewal.enabled && browserRenewal.verified
              ? "Выключить переподключение в этой вкладке"
              : "Проверить и включить переподключение в этой вкладке"}
        </Button>
        {renewalError && (
          <p role="alert" className="text-sm text-rose-700">
            {renewalError}
          </p>
        )}
      </div>
      <div className="space-y-2 rounded-2xl border border-line p-4">
        <p className="text-sm text-muted-ui-foreground">
          {status.data?.vkId?.connected
            ? "Подключение VK ID с автообновлением активно."
            : "Подключение с автообновлением станет активным только после проверки доступа к фотографиям и обновления токена. До этого используется прежнее подключение."}
        </p>
        <Button
          variant="secondary"
          disabled={!status.data?.vkId?.configured || vkIdConnect.isPending}
          onClick={() => vkIdConnect.mutate()}
        >
          {vkIdConnect.isPending
            ? "Открываем VK ID…"
            : "Проверить доступ с автообновлением"}
        </Button>
        {status.data && !status.data.vkId?.configured && (
          <p className="text-sm text-muted-ui-foreground">
            Для проверки нужно настроить приложение VK ID. Обратитесь к
            администратору проекта.
          </p>
        )}
        {vkIdConnect.error && (
          <p role="alert" className="text-sm text-rose-700">
            {contentFactoryErrorMessage(
              vkIdConnect.error,
              "Не удалось начать подключение VK ID.",
            )}
          </p>
        )}
      </div>
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
