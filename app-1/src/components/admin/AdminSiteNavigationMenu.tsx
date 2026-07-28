import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { ChevronDown, PanelTop } from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { adminSiteNavigation } from "@/components/admin/admin-site-navigation";
import { cn } from "@/lib/cn";

export const AdminSiteNavigationMenu = ({
  path,
  selected,
}: {
  readonly path: string;
  readonly selected: boolean;
}) => {
  const isSiteManagement = path.startsWith(AMAZI_ROUTES.adminSiteManagement);
  const [menuOverride, setMenuOverride] = useState<{
    readonly open: boolean;
    readonly path: string;
  } | null>(null);
  const isOpen =
    menuOverride?.path === path ? menuOverride.open : isSiteManagement;

  return (
    <div className="grid gap-1">
      <button
        aria-controls="admin-site-navigation"
        aria-expanded={isOpen}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
          selected
            ? "bg-brand-foreground/10 text-brand-foreground"
            : "text-brand-foreground/75 hover:bg-brand-foreground/5 hover:text-brand-foreground",
        )}
        onClick={() =>
          setMenuOverride({
            open: !isOpen,
            path,
          })
        }
        type="button"
      >
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            selected ? "bg-brand-foreground/10" : "bg-brand-foreground/5",
          )}
        >
          <PanelTop className="size-5" />
        </span>
        <span className="leading-5">Управление сайтом</span>
        <ChevronDown
          className={cn(
            "ml-auto size-4 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>
      {isOpen && (
        <div className="grid gap-1 pl-12" id="admin-site-navigation">
          {adminSiteNavigation.map((item) => (
            <Link
              aria-current={path === item.to ? "page" : undefined}
              className={cn(
                "min-h-11 rounded-xl px-4 py-3 text-sm font-medium transition",
                path === item.to
                  ? "bg-brand-foreground/15 text-brand-foreground"
                  : "text-brand-foreground/80 hover:bg-brand-foreground/5 hover:text-brand-foreground",
              )}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
