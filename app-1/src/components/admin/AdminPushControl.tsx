import { useEffect, useState } from "react";

import {
  loadAdminPushConfiguration,
  loadAdminPushSubscription,
  removeAdminPushSubscription,
  saveAdminPushSubscription,
} from "@/lib/admin/admin-push-api";

type PushState =
  | "loading"
  | "unsupported"
  | "needs-home-screen"
  | "unconfigured"
  | "disabled"
  | "enabled"
  | "denied"
  | "error";

const isIosDevice = () =>
  /iPad|iPhone|iPod/u.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isStandaloneApp = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const supportsBrowserPush = () =>
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

const decodeApplicationServerKey = (value: string): Uint8Array => {
  const base64 = value.replace(/-/gu, "+").replace(/_/gu, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(window.atob(padded), (character) =>
    character.charCodeAt(0),
  );
};

const subscriptionBody = (subscription: PushSubscription) => {
  const value = subscription.toJSON();
  if (!value.keys?.auth || !value.keys.p256dh)
    throw new Error("Browser subscription keys are unavailable.");
  return {
    endpoint: subscription.endpoint,
    keys: { auth: value.keys.auth, p256dh: value.keys.p256dh },
  };
};

export const AdminPushControl = () => {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkSubscription = async () => {
      try {
        const { data: configuration } = await loadAdminPushConfiguration();
        if (!configuration.enabled || !configuration.publicKey) {
          if (mounted) setState("unconfigured");
          return;
        }
        if (mounted) setPublicKey(configuration.publicKey);
        if (!supportsBrowserPush()) {
          if (mounted) setState("unsupported");
          return;
        }
        if (isIosDevice() && !isStandaloneApp()) {
          if (mounted) setState("needs-home-screen");
          return;
        }
        if (Notification.permission === "denied") {
          if (mounted) setState("denied");
          return;
        }
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) {
          if (mounted) setState("disabled");
          return;
        }
        const { data } = await loadAdminPushSubscription(subscription.endpoint);
        if (mounted) setState(data.subscribed ? "enabled" : "disabled");
      } catch {
        if (mounted) setState("error");
      }
    };
    void checkSubscription();
    return () => {
      mounted = false;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      if (!supportsBrowserPush()) {
        setState("unsupported");
        return;
      }
      if (isIosDevice() && !isStandaloneApp()) {
        setState("needs-home-screen");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "disabled");
        return;
      }
      if (!publicKey) {
        setState("unconfigured");
        return;
      }
      const registration = await navigator.serviceWorker.register(
        "/admin-push-sw.js",
        { scope: "/" },
      );
      let subscription = await registration.pushManager.getSubscription();
      subscription ??= await registration.pushManager.subscribe({
        applicationServerKey: decodeApplicationServerKey(
          publicKey,
        ) as BufferSource,
        userVisibleOnly: true,
      });
      await saveAdminPushSubscription(subscriptionBody(subscription));
      setState("enabled");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removeAdminPushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("disabled");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-line px-4 py-3">
      <p className="text-xs font-semibold text-brand">Уведомления в браузере</p>
      {state === "needs-home-screen" ? (
        <p className="mt-1 text-xs leading-5 text-muted-ui-foreground">
          На iPhone и iPad с iOS/iPadOS 16.4+ добавьте админку на экран «Домой»
          через меню «Поделиться» и откройте её с этого значка.
        </p>
      ) : state === "unsupported" ? (
        <p className="mt-1 text-xs leading-5 text-muted-ui-foreground">
          Этот браузер не поддерживает push-уведомления.
        </p>
      ) : state === "denied" ? (
        <p className="mt-1 text-xs leading-5 text-muted-ui-foreground">
          Разрешение отключено в настройках браузера. Его можно включить там же.
        </p>
      ) : state === "unconfigured" ? (
        <p className="mt-1 text-xs leading-5 text-muted-ui-foreground">
          Push-уведомления пока не настроены на сервере.
        </p>
      ) : state === "enabled" ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-ui-foreground">
            Новые заявки придут, даже если админка закрыта.
          </span>
          <button
            className="shrink-0 text-xs font-semibold text-brand hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() => void disable()}
            type="button"
          >
            Отключить
          </button>
        </div>
      ) : state === "loading" ? (
        <p className="mt-1 text-xs text-muted-ui-foreground">Проверяем…</p>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-ui-foreground">
            Получайте новые заявки, даже если вкладка закрыта.
          </span>
          <button
            className="shrink-0 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground transition hover:bg-brand/90 disabled:opacity-50"
            disabled={busy}
            onClick={() => void enable()}
            type="button"
          >
            {busy ? "Подключаем…" : "Включить"}
          </button>
        </div>
      )}
      {state === "error" && (
        <p className="mt-2 text-xs text-destructive">
          Не удалось изменить настройку. Попробуйте ещё раз.
        </p>
      )}
    </div>
  );
};
