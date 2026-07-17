import { useState } from "react";
import { Link } from "react-router-dom";

import { ChevronDown, Menu, UserRound, X } from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import logoGreen from "@/assets/alsma/logo-green.svg";
import logoWhite from "@/assets/alsma/logo-white.svg";
import { cn } from "@/lib/cn";

const navigation = [
  { label: "Проживание", to: AMAZI_ROUTES.rooms },
  { label: "SPA", to: AMAZI_ROUTES.spa },
  { label: "Развлечения", to: AMAZI_ROUTES.entertainment },
  { label: "Все включено", to: AMAZI_ROUTES.allInclusive },
  { label: "О нас", to: AMAZI_ROUTES.about },
  { label: "Акции", to: AMAZI_ROUTES.offers },
];

const moreNavigation = [
  { label: "Аппаратные процедуры", to: AMAZI_ROUTES.hardwareProcedures },
  { label: "Новости", to: AMAZI_ROUTES.news },
  { label: "Блог", to: AMAZI_ROUTES.blog },
  { label: "Торжества и корпоративный отдых", to: AMAZI_ROUTES.celebrations },
  { label: "Политика конфиденциальности", to: AMAZI_ROUTES.privacy },
];

export const SiteHeader = ({ light = false }: { readonly light?: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <header
      className={cn(
        "fixed top-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-7xl -translate-x-1/2 items-center justify-between rounded-full border px-5 py-3 backdrop-blur-md",
        light
          ? "border-brand/10 bg-panel/90 text-brand shadow-lg"
          : "border-brand-foreground/20 bg-page-foreground/15 text-brand-foreground",
      )}
    >
      <Link aria-label="АЛСМА" to={AMAZI_ROUTES.home}>
        <img
          alt="АЛСМА"
          className="h-10 w-36 object-contain"
          src={light ? logoGreen : logoWhite}
        />
      </Link>
      <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
        {navigation.map((item) => (
          <Link
            className="transition hover:opacity-70"
            key={item.to}
            to={item.to}
          >
            {item.label}
          </Link>
        ))}
        <div className="group relative">
          <button
            className="flex items-center gap-1 py-3 transition outline-none hover:opacity-70"
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
          className="hidden size-11 place-items-center rounded-full outline-none sm:grid"
          to={AMAZI_ROUTES.account}
        >
          <UserRound className="size-5" />
        </Link>
        <Link
          className="hidden rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground sm:block"
          to={AMAZI_ROUTES.rooms}
        >
          Забронировать
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
            onClick={() => setOpen(false)}
            to={AMAZI_ROUTES.rooms}
          >
            Забронировать
          </Link>
        </nav>
      )}
    </header>
  );
};
