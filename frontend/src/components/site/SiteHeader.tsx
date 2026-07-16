import { useState } from "react";
import { Link } from "react-router-dom";

import { Menu, UserRound, X } from "lucide-react";

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
      </nav>
      <div className="flex items-center gap-2">
        <Link
          aria-label="Личный кабинет"
          className="grid size-11 place-items-center rounded-full border border-current/15"
          to={AMAZI_ROUTES.account}
        >
          <UserRound className="size-5" />
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
          {navigation.map((item) => (
            <Link key={item.to} onClick={() => setOpen(false)} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};
