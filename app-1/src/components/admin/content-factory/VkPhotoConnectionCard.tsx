import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import {
  loadVkPhotoConnection,
  startVkPhotoConnection,
} from "@/lib/content-factory/vkPhotoConnectionApi";

const messages: Record<string, string> = {
  CONNECTED:
    "Доступ к загрузке фото подтверждён. Можно планировать публикации.",
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
    </section>
  );
};
