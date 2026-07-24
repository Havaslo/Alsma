import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { X } from "lucide-react";

import { getSiteCollection } from "@/lib/site/content-collections";
import {
  HOME_POPUP_BANNERS,
  type HomePopupBanner,
} from "@/lib/site/home-content";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const SiteOfferPopup = () => {
  const [visiblePath, setVisiblePath] = useState<string>();
  const location = useLocation();
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-page-foreground/55 p-4 backdrop-blur-sm">
      <article className="relative grid max-w-3xl overflow-hidden rounded-3xl bg-panel shadow-2xl md:grid-cols-2">
        <button
          aria-label="Закрыть предложение"
          className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-panel/90 text-page-foreground"
          onClick={() => setVisiblePath(undefined)}
          type="button"
        >
          <X className="size-5" />
        </button>
        <img
          alt=""
          className="size-full h-64 object-cover md:h-full"
          src={banner.image}
        />
        <div className="p-8 md:p-10">
          <p className="text-sm font-bold tracking-widest text-brand uppercase">
            {banner.badge}
          </p>
          <h2 className="mt-4 font-heading text-3xl font-semibold">
            {banner.title}
          </h2>
          <p className="mt-4 leading-7 text-muted-ui-foreground">
            {banner.description}
          </p>
          <a
            className="mt-7 inline-flex rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
            href={banner.buttonHref}
          >
            {banner.buttonLabel}
          </a>
        </div>
      </article>
    </div>
  );
};
