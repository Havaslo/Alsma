import { useEffect, useRef, useState } from "react";

import { LoaderCircle } from "lucide-react";

import { SiteHeader } from "@/components/site/SiteHeader";

const WIDGET_SCRIPT_ID = "uhotels-booking-widget-loader";
const WIDGET_SCRIPT_URL =
  "https://api.uhotels.app/widget/booking2/loader.js?30";

type WidgetState = "loading" | "ready" | "error";

declare global {
  interface Window {
    artDg?: {
      config?: Record<string, string | number | boolean>;
      loader?: boolean;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

const loadWidgetScript = () => {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(WIDGET_SCRIPT_ID);
    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = WIDGET_SCRIPT_ID;
    script.async = true;
    script.src = WIDGET_SCRIPT_URL;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", () => reject(), { once: true });
    document.head.appendChild(script);
  });

  return scriptPromise;
};

export const UHotelsBookingPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<WidgetState>("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.artDg = window.artDg || { loader: false };
    window.artDg.config = {
      container: "adg-booking-widget",
      hotel: "1314:1ef9f35bb0684699e3d48d96562e1fbb",
      lang: "ru",
      headerHeight: 0,
      footerHeight: 0,
      type: "2",
      css: "",
      country: "ru",
      yaMetrika: "",
      bookingRequest: "",
      hidePrices: false,
      checkGuests: false,
    };
    if (!window.artDg.loader) window.artDg.loader = true;

    const observer = new MutationObserver(() => {
      if (container.children.length > 0) setState("ready");
    });
    observer.observe(container, { childList: true, subtree: true });

    let fallbackTimer: number | undefined;
    loadWidgetScript()
      .then(() => {
        if (container.children.length > 0) {
          setState("ready");
          return;
        }
        fallbackTimer = window.setTimeout(() => {
          if (container.children.length === 0) setState("error");
        }, 4000);
      })
      .catch(() => setState("error"));

    return () => {
      observer.disconnect();
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-page pb-20 text-page-foreground">
      <SiteHeader light staticPosition transparentAtTop={false} />
      <section className="mx-auto max-w-[100rem] px-5 pt-12 sm:px-8">
        <section
          aria-label="Форма бронирования U-Hotels"
          className="relative min-h-[32rem]"
        >
          {state === "loading" && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-3xl bg-panel/90">
              <div className="flex items-center gap-3 text-sm font-medium text-muted-ui-foreground">
                <LoaderCircle className="size-5 animate-spin text-brand" />
                Загружаем форму бронирования…
              </div>
            </div>
          )}
          {state === "error" && (
            <div className="absolute inset-4 z-10 grid place-items-center rounded-2xl bg-panel p-6 text-center sm:inset-8">
              <div className="max-w-md">
                <h2 className="font-heading text-2xl font-semibold">
                  Не удалось загрузить форму
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-ui-foreground">
                  Проверьте подключение к интернету и обновите страницу. Форма
                  бронирования предоставляется официальной системой U-Hotels.
                </p>
                <button
                  className="mt-6 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
                  onClick={() => window.location.reload()}
                  type="button"
                >
                  Обновить страницу
                </button>
              </div>
            </div>
          )}
          <div className="mx-auto" id="adg-booking-widget" ref={containerRef} />
        </section>
      </section>
    </main>
  );
};
