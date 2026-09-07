import { useEffect, useState } from "react";

import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";

import logoGreen from "@/assets/alsma/logo-green.svg";
import logoWhite from "@/assets/alsma/logo-white.svg";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/route-constants";

const navigation = [
  { label: "Проживание", to: ROUTES.rooms },
  { label: "SPA", to: ROUTES.spa },
  { label: "Услуги", to: ROUTES.services },
  { label: "Развлечения", to: ROUTES.entertainment },
  { label: "Все включено", to: ROUTES.allInclusive },
  { label: "О нас", to: ROUTES.about },
  { label: "Акции", to: ROUTES.offers },
];

const moreNavigation = [
  { label: "Частые вопросы", to: ROUTES.faq },
  { label: "Аппаратные процедуры", to: ROUTES.hardwareProcedures },
  { label: "Новости", to: ROUTES.news },
  { label: "Блог", to: ROUTES.blog },
  { label: "Торжества и корпоративный отдых", to: ROUTES.celebrations },
  { label: "Политика конфиденциальности", to: ROUTES.privacy },
];

export const SiteHeader = ({
  bookingLabel = "Забронировать",
  bookingTo = ROUTES.booking,
  light = false,
  staticPosition = false,
  transparentAtTop = true,
}: {
  readonly bookingLabel?: string;
  readonly bookingTo?: string;
  readonly light?: boolean;
  readonly staticPosition?: boolean;
  readonly transparentAtTop?: boolean;
}) => {
  const location = useRouterState({ select: (state) => state.location });
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const useLightStyle = light || (transparentAtTop && scrolled);

  useEffect(() => {
    if (!transparentAtTop) return;
    const update = () => setScrolled(window.scrollY > 32);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [transparentAtTop]);

  useEffect(() => {
    if (location.hash !== "#booking") return;

    const scrollFrame = window.requestAnimationFrame(() => {
      document
        .getElementById("booking")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(scrollFrame);
  }, [location.hash, location.pathname]);

  const scrollToBooking = () => {
    if (location.pathname !== ROUTES.home) return;
    document
      .getElementById("booking")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  return (
    <header
      className={cn(
        "z-50 flex w-[calc(100%-2rem)] max-w-[100rem] items-center justify-between rounded-full border px-5 py-4 backdrop-blur-sm transition duration-300",
        staticPosition
          ? "relative top-4 mx-auto"
          : "fixed top-4 left-1/2 -translate-x-1/2",
        useLightStyle
          ? "border-brand/10 bg-page text-brand shadow-xl"
          : "border-brand-foreground/15 bg-brand-foreground/5 text-brand-foreground",
      )}
    >
      <Link aria-label="АЛСМА" to={ROUTES.home}>
        <img
          alt="АЛСМА"
          className="h-10 w-36 object-contain"
          src={useLightStyle ? logoGreen : logoWhite}
        />
      </Link>
      <nav className="hidden items-center gap-5 text-base font-medium lg:flex xl:gap-7 xl:text-lg 2xl:gap-8">
        {navigation.map((item) => (
          <Link
            className={cn(
              "transition",
              useLightStyle
                ? "text-brand hover:text-brand/75"
                : "text-brand-foreground/90 hover:text-brand-foreground",
            )}
            key={item.to}
            to={item.to}
          >
            {item.label}
          </Link>
        ))}
        <div className="group relative">
          <button
            className={cn(
              "flex items-center gap-1 py-3 transition outline-none",
              useLightStyle
                ? "text-brand hover:text-brand/75"
                : "text-brand-foreground/90 hover:text-brand-foreground",
            )}
            type="button"
          >
            Еще <ChevronDown className="size-4" />
          </button>
          <div className="invisible absolute top-full right-0 w-72 translate-y-2 rounded-3xl bg-page p-3 text-brand opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            {moreNavigation.map((item) => (
              <Link
                className="block rounded-2xl px-4 py-3 hover:bg-panel"
                key={item.to}
                to={item.to}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <div className="flex items-center gap-2">
        <Link
          aria-label="Личный кабинет"
          className={cn(
            "grid size-11 place-items-center rounded-full border border-current/15 transition hover:scale-105",
            useLightStyle ? "text-brand" : "text-brand-foreground",
          )}
          title="Личный кабинет"
          to={ROUTES.account}
        >
          <UserRound className="size-5" />
        </Link>
        <Link
          className="hidden rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground sm:block"
          onClick={scrollToBooking}
          to={bookingTo}
        >
          {bookingLabel}
        </Link>
        <button
          aria-label="Меню"
          className="grid size-11 place-items-center rounded-full border border-current/15 lg:hidden"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="absolute inset-x-0 top-16 flex flex-col gap-3 rounded-3xl bg-brand p-6 text-brand-foreground lg:hidden">
          {[...navigation, ...moreNavigation].map((item) => (
            <Link key={item.to} onClick={() => setOpen(false)} to={item.to}>
              {item.label}
            </Link>
          ))}
          <Link
            className="mt-2 rounded-full bg-page px-5 py-3 text-center font-semibold text-brand"
            onClick={() => {
              setOpen(false);
              scrollToBooking();
            }}
            to={bookingTo}
          >
            {bookingLabel}
          </Link>
          <Link onClick={() => setOpen(false)} to={ROUTES.account}>
            Личный кабинет
          </Link>
        </nav>
      )}
    </header>
  );
};
