import { useMutation, useQuery } from "@tanstack/react-query";
import { Instagram, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import {
  loadInstagramConnectionStatus,
  startInstagramConnection,
} from "@/lib/content-factory/instagramConnectionApi";

const queryKey = ["content-factory", "instagram-connection"] as const;

export const InstagramConnectionCard = () => {
  const status = useQuery({
    queryKey,
    queryFn: ({ signal }) => loadInstagramConnectionStatus(signal),
    staleTime: 15_000,
  });
  const connect = useMutation({
    mutationFn: startInstagramConnection,
    onSuccess: (authorizationUrl) => window.location.assign(authorizationUrl),
  });
  const outcome = new URLSearchParams(window.location.search).get(
    "instagramConnection",
  );
  const connectionMessage =
    outcome === "connected"
      ? "Instagram подключён. Проверьте название профиля ниже."
      : outcome === "target_account_not_found"
        ? "Meta подтвердила вход, но приложение не смогло распознать связанный Instagram-профиль или право на публикацию."
        : outcome === "authorization_cancelled"
          ? "Авторизация отменена. Подключение не изменено."
          : outcome === "provider_error"
            ? "Meta не завершила подключение. Проверьте настройки приложения и попробуйте ещё раз."
            : outcome === "invalid_state"
              ? "Ссылка авторизации устарела. Запустите подключение заново."
              : "";
  const errorMessage = connect.error
    ? contentFactoryErrorMessage(
        connect.error,
        "Не удалось начать подключение Instagram.",
      )
    : "";

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-page text-brand">
          <Instagram aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold text-page-foreground">
            Подключение Instagram
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-ui-foreground">
            {status.data?.connected
              ? `Подключён профиль @${status.data.username}.`
              : status.data?.needsReconnect
                ? `Срок доступа @${status.data.username} истёк — подключите аккаунт снова.`
                : status.data?.targetUsername
                  ? `Целевой профиль: @${status.data.targetUsername}. Владелец войдёт через Facebook и подтвердит разрешения Meta.`
                  : "Владелец аккаунта сможет разрешить доступ через официальное окно Meta."}
          </p>
          {!status.data?.configured && (
            <p className="mt-1 text-xs leading-5 text-amber-800">
              Сначала нужно настроить приложение Meta и добавить его данные в
              защищённые настройки проекта.
            </p>
          )}
          {connectionMessage && (
            <p className="mt-2 text-sm text-page-foreground" role="status">
              {connectionMessage}
            </p>
          )}
          {(status.error || errorMessage) && (
            <p className="mt-2 text-sm text-rose-700" role="alert">
              {errorMessage || "Не удалось проверить подключение Instagram."}
            </p>
          )}
          {status.data && !status.data.publishingEnabled && (
            <p className="mt-1 text-xs text-muted-ui-foreground">
              Авторизация профиля ещё не включает автопубликацию.
            </p>
          )}
        </div>
      </div>
      <Button
        className="shrink-0 self-start sm:self-center"
        disabled={
          !status.data?.configured || status.isLoading || connect.isPending
        }
        onClick={() => connect.mutate()}
        variant="secondary"
      >
        {connect.isPending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Instagram aria-hidden="true" className="size-4" />
        )}
        {status.data?.connected ? "Переподключить" : "Подключить Instagram"}
      </Button>
    </section>
  );
};
