import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

const COOKIE_STORAGE_KEY = "alsma-cookie-preferences-v1";
const CONSENT_VERSION = "2026-10-15";
const METRIKA_ID = 112484251;

type CookiePreferences = {
  readonly action: string;
  readonly analytics: boolean;
  readonly acceptedAt: string;
  readonly pageUrl: string;
  readonly purpose: string;
  readonly version: string;
};

type CookieSettingsContextValue = { readonly openCookieSettings: () => void };
const CookieSettingsContext = createContext<CookieSettingsContextValue | null>(
  null,
);

declare global {
  interface Window {
    disableYaCounter112484251?: boolean;
    ym?: (...args: unknown[]) => void;
  }
}

const readPreferences = (): CookiePreferences | null => {
  try {
    const value = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("analytics" in parsed) ||
      typeof parsed.analytics !== "boolean" ||
      !("version" in parsed) ||
      parsed.version !== CONSENT_VERSION
    )
      return null;
    return parsed as CookiePreferences;
  } catch {
    return null;
  }
};

const startMetrika = () => {
  window.disableYaCounter112484251 = false;
  if (!window.ym) {
    const queue = ((...args: unknown[]) => {
      (queue.a ??= []).push(args);
    }) as ((...args: unknown[]) => void) & {
      a?: unknown[][];
      l?: number;
    };
    queue.a = [];
    queue.l = Date.now();
    window.ym = queue;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`;
    script.dataset.cookieCategory = "analytics";
    document.head.appendChild(script);
  }
  window.ym?.(METRIKA_ID, "init", {
    accurateTrackBounce: true,
    clickmap: true,
    ecommerce: "dataLayer",
    trackLinks: true,
  });
};

export const useCookieSettings = () => {
  const context = useContext(CookieSettingsContext);
  if (!context)
    throw new Error(
      "Cookie settings must be used inside the consent provider.",
    );
  return context;
};

export const CookieSettingsButton = () => {
  const { openCookieSettings } = useCookieSettings();
  return (
    <button
      className="mt-4 text-left text-sm text-brand-foreground/80 underline decoration-brand-foreground/40 underline-offset-4 transition hover:text-brand-foreground"
      onClick={openCookieSettings}
      type="button"
    >
      Настройки cookie
    </button>
  );
};

export const CookieConsentProvider = ({
  children,
  showControls = true,
}: {
  readonly children: ReactNode;
  readonly showControls?: boolean;
}) => {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(() =>
    readPreferences(),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsDraft, setAnalyticsDraft] = useState(
    () => readPreferences()?.analytics ?? false,
  );

  useEffect(() => {
    if (!preferences?.analytics) {
      window.disableYaCounter112484251 = true;
      return;
    }
    startMetrika();
  }, [preferences]);

  const savePreferences = (analytics: boolean) => {
    const next: CookiePreferences = {
      action: analytics
        ? "accept_optional_analytics_cookies"
        : "reject_optional_analytics_cookies",
      analytics,
      acceptedAt: new Date().toISOString(),
      pageUrl: `${window.location.origin}${window.location.pathname}`,
      purpose: "cookie_preferences",
      version: CONSENT_VERSION,
    };
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the choice active for this visit if browser storage is unavailable.
    }
    setPreferences(next);
    setSettingsOpen(false);
    if (preferences?.analytics && !analytics) window.location.reload();
  };

  const openCookieSettings = () => {
    setAnalyticsDraft(preferences?.analytics ?? false);
    setSettingsOpen(true);
  };

  return (
    <CookieSettingsContext.Provider value={{ openCookieSettings }}>
      {children}
      {showControls && !preferences && !settingsOpen && (
        <aside
          aria-label="Настройки cookie"
          className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-3xl rounded-3xl border border-line bg-panel p-5 shadow-2xl sm:inset-x-6 sm:p-7"
          role="region"
        >
          <h2 className="font-heading text-xl font-semibold text-brand">
            Настройки cookie
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
            Необязательная аналитика включается только после вашего выбора.
            Подробнее — в{" "}
            <a className="font-semibold text-brand underline" href="/cookies">
              уведомлении о cookie
            </a>{" "}
            и{" "}
            <a className="font-semibold text-brand underline" href="/privacy">
              Политике обработки персональных данных
            </a>
            .
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="rounded-full bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground"
              onClick={() => savePreferences(true)}
              type="button"
            >
              Разрешить необязательные cookie
            </button>
            <button
              className="rounded-full border border-line px-4 py-3 text-sm font-semibold text-brand"
              onClick={() => savePreferences(false)}
              type="button"
            >
              Только необходимые
            </button>
            <button
              className="rounded-full px-4 py-3 text-sm font-semibold text-brand underline underline-offset-4"
              onClick={openCookieSettings}
              type="button"
            >
              Настроить
            </button>
          </div>
        </aside>
      )}
      {showControls && settingsOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
          <section
            aria-labelledby="cookie-settings-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-3xl bg-white p-6 text-gray-900 shadow-2xl sm:p-8"
            role="dialog"
          >
            <h2
              className="font-heading text-2xl font-semibold text-brand"
              id="cookie-settings-title"
            >
              Настройки cookie
            </h2>
            <div className="mt-6 space-y-5 text-sm leading-6">
              <label className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
                <input
                  checked
                  className="mt-1 size-5 shrink-0 accent-brand"
                  disabled
                  type="checkbox"
                />
                <span>
                  <strong className="block">Необходимые</strong>
                  Нужны для работы сайта и сохранения вашего выбора. Всегда
                  активны.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-gray-50 p-4">
                <input
                  checked={analyticsDraft}
                  className="mt-1 size-5 shrink-0 accent-brand"
                  onChange={(event) => setAnalyticsDraft(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong className="block">Аналитические</strong>
                  Яндекс.Метрика — помогает оценивать посещаемость сайта.
                  Подробности — в{" "}
                  <a
                    className="font-semibold text-brand underline"
                    href="/cookies"
                  >
                    уведомлении о cookie
                  </a>
                  .
                </span>
              </label>
            </div>
            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-3 py-3 text-center text-sm font-semibold text-brand hover:bg-gray-50"
                onClick={() => setSettingsOpen(false)}
                type="button"
              >
                Отмена
              </button>
              <button
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line px-3 py-3 text-center text-sm font-semibold text-brand"
                onClick={() => savePreferences(false)}
                type="button"
              >
                Только необходимые
              </button>
              <button
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand px-3 py-3 text-center text-sm font-semibold text-brand-foreground"
                onClick={() => savePreferences(analyticsDraft)}
                type="button"
              >
                Сохранить выбор
              </button>
            </div>
          </section>
        </div>
      )}
    </CookieSettingsContext.Provider>
  );
};
