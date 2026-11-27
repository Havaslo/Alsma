import { useEffect, useRef, useState } from "react";

import {
  canEmbedTravelLine,
  useTravelLineConfig,
} from "@/lib/booking/travelline-widget-config";

type WidgetKind = "booking-form" | "search-form";
type Command =
  ["setContext", string, "ru"] | ["embed", WidgetKind, { container: string }];
type Integration = {
  __cq?: { concat: (commands: Command[]) => NonNullable<Integration["__cq"]> };
  __loader?: boolean;
};
type TravelLineWindow = Window & {
  TL?: unknown;
  travelline?: { integration?: Integration };
};

const loaderHosts = [
  "ru-ibe.tlintegration.ru",
  "ibe.tlintegration.ru",
  "ibe.tlintegration.com",
];

function embed(kind: WidgetKind, container: string) {
  const vendor = window as TravelLineWindow;
  const travelLine = (vendor.travelline ??= {});
  const integration = (travelLine.integration ??= {});
  const commands: Command[] = [
    ["setContext", "TL-INT-alsma-ru_2026-11-27", "ru"],
    ["embed", kind, { container }],
  ];
  integration.__cq = integration.__cq?.concat(commands) ?? commands;
  if (integration.__loader) return;
  integration.__loader = true;

  const load = (index: number) => {
    const host = loaderHosts[index];
    if (!host) {
      integration.__loader = false;
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://${host}/integration/loader.js`;
    script.onload = script.onerror = () => {
      if (vendor.TL) return;
      script.remove();
      load(index + 1);
    };
    document.head.append(script);
  };
  load(0);
}

export const TravelLineWidget = ({
  kind,
  fallback,
  unavailable,
}: {
  kind: WidgetKind;
  fallback?: React.ReactNode;
  unavailable?: React.ReactNode;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  const id = kind === "booking-form" ? "tl-booking-form" : "tl-search-form";

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const deadline = window.setTimeout(() => setStatus("unavailable"), 15_000);
    const observer = new MutationObserver(() => {
      if (
        element.querySelector(
          kind === "booking-form" ? "iframe" : "input, iframe",
        )
      ) {
        window.clearTimeout(deadline);
        setStatus("ready");
        observer.disconnect();
      }
    });
    observer.observe(element, { childList: true, subtree: true });
    // Defer past React StrictMode's setup/cleanup pass before calling the SDK.
    const task = window.setTimeout(() => embed(kind, id), 0);
    return () => {
      window.clearTimeout(task);
      window.clearTimeout(deadline);
      observer.disconnect();
    };
  }, [id, kind]);

  return (
    <>
      <div
        className={
          kind === "booking-form"
            ? "relative z-0 mx-auto w-full max-w-[1440px]"
            : "box-border px-3 sm:px-[30px]"
        }
        id={id}
        ref={container}
      />
      {status === "loading" && fallback}
      {status === "unavailable" && unavailable}
    </>
  );
};

export const TravelLineSearch = () => {
  const config = useTravelLineConfig();
  if (
    !canEmbedTravelLine() ||
    !config.data?.enabled ||
    !config.data.checkoutReady
  )
    return null;

  return (
    <div className="w-full rounded-2xl bg-[#e5dbce] text-page-foreground empty:hidden">
      <TravelLineWidget kind="search-form" />
    </div>
  );
};
