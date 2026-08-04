import { useEffect, useState } from "react";

import { useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";

import { getSiteCollection } from "@/lib/site/content-collections";
import {
  HOME_POPUP_BANNERS,
  type HomePopupBanner,
} from "@/lib/site/home-content";
import { resolveMediaUrl } from "@/lib/site/media-url";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const SiteOfferPopup = () => {
  const [visiblePath, setVisiblePath] = useState<string>();
  const location = useRouterState({ select: (state) => state.location });
  const content = usePublishedSiteContent("home");
  const banners = getSiteCollection<HomePopupBanner>(
    content.data?.items,
    "popup-banners",
    HOME_POPUP_BANNERS,
  );
  const banner = banners.find(
    (item) =>
      item.isActive !== false &&
      (item.pagePaths.length === 0 ||
        item.pagePaths.includes(location.pathname)),
  );

  useEffect(() => {
    if (!banner) return undefined;
    const timer = window.setTimeout(
      () => setVisiblePath(location.pathname),
      Math.max(banner.displayDelaySeconds, 0) * 1_000,
    );
    return () => window.clearTimeout(timer);
  }, [banner, location.pathname]);

  if (!banner || visiblePath !== location.pathname) return null;

  return (
    <article className="fixed right-4 bottom-4 left-4 z-50 max-w-md overflow-hidden rounded-3xl border border-line/50 bg-panel shadow-2xl sm:right-auto sm:bottom-6 sm:left-6 sm:w-full">
      <button
        aria-label="Закрыть предложение"
        className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-panel/95 text-page-foreground shadow-sm transition hover:bg-panel"
        onClick={() => setVisiblePath(undefined)}
        type="button"
      >
        <X className="size-5" />
      </button>
      <img
        alt=""
        className="h-48 w-full object-cover sm:h-52"
        src={resolveMediaUrl(banner.image)}
      />
      <div className="p-6 sm:p-7">
        <p className="text-xs font-bold tracking-widest text-brand uppercase">
          {banner.badge}
        </p>
        <h2 className="mt-3 font-heading text-3xl leading-none font-semibold">
          {banner.title}
        </h2>
        <p className="mt-4 line-clamp-3 leading-6 text-muted-ui-foreground">
          {banner.description}
        </p>
        <a
          className="mt-5 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground"
          href={banner.buttonHref}
        >
          {banner.buttonLabel}
        </a>
      </div>
    </article>
  );
};
