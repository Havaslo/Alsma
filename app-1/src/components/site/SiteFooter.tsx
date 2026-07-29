import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";

import logoWhite from "@/assets/alsma/logo-white.svg";
import { ROUTES } from "@/route-constants";

const navigation = [
  ["Номера", ROUTES.rooms],
  ["SPA", ROUTES.spa],
  ["Новости", ROUTES.news],
  ["Блог", ROUTES.blog],
  ["Аппаратные процедуры", ROUTES.hardwareProcedures],
  ["Развлечения и анимация", ROUTES.entertainment],
  ["Торжества и корпоративный отдых", ROUTES.celebrations],
  ["Всё включено", ROUTES.allInclusive],
  ["Акции", ROUTES.offers],
  ["О нас", ROUTES.about],
] as const;

const contacts = [
  ["+7 930 283-88-28", "многоканальный", "tel:+79302838828"],
  ["+7 920 013-17-61", "администратор", "tel:+79200131761"],
  ["+7 920 034-35-79", "групповые заезды", "tel:+79200343579"],
  ["+7 986 725-57-77", "бронирование", "tel:+79867255777"],
] as const;

export const SiteFooter = () => (
  <footer className="bg-brand py-16 text-brand-foreground">
    <div className="mx-auto grid max-w-[100rem] gap-10 px-5 sm:px-8 lg:grid-cols-[1.1fr_1fr_0.9fr_1.2fr]">
      <div>
        <Link aria-label="АЛСМА" to={ROUTES.home}>
          <img
            alt="АЛСМА"
            className="h-11 w-40 object-contain"
            src={logoWhite}
          />
        </Link>
        <p className="mt-5 max-w-xs leading-7 text-brand-foreground/70">
          SPA-отель среди сосен в 35 минутах от Нижнего Новгорода.
        </p>
      </div>
      <div>
        <p className="text-sm font-semibold tracking-widest text-brand-foreground/55 uppercase">
          Навигация
        </p>
        <ul className="mt-5 space-y-3 text-sm text-brand-foreground/80">
          {navigation.map(([label, to]) => (
            <li key={to}>
              <Link className="transition hover:text-brand-foreground" to={to}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-sm font-semibold tracking-widest text-brand-foreground/55 uppercase">
          Связаться
        </p>
        <div className="mt-5 space-y-4 text-brand-foreground/80">
          <a className="flex items-center gap-2" href="tel:+79867255777">
            <Phone className="size-4" /> Позвонить
          </a>
          <a
            className="flex items-center gap-2"
            href="mailto:info@alsma-baza.ru"
          >
            <Mail className="size-4" /> Написать
          </a>
          <a href="https://vk.com/alsma_nnov" rel="noreferrer" target="_blank">
            ВКонтакте ↗
          </a>
          <a
            className="block"
            href="https://t.me/alsma_hotel"
            rel="noreferrer"
            target="_blank"
          >
            Telegram ↗
          </a>
          <Link className="block" to={ROUTES.privacy}>
            Политика конфиденциальности
          </Link>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold tracking-widest text-brand-foreground/55 uppercase">
          Контакты
        </p>
        <p className="mt-5 flex gap-2 leading-7 text-brand-foreground/80">
          <MapPin className="mt-1 size-4 shrink-0" /> Нижегородская обл., г.
          Бор, д. Васильково, ул. Лесная, д. 7
        </p>
        <ul className="mt-5 space-y-3 text-sm text-brand-foreground/80">
          {contacts.map(([phone, label, href]) => (
            <li key={phone}>
              <a className="font-semibold" href={href}>
                {phone}
              </a>{" "}
              — {label}
            </li>
          ))}
        </ul>
        <a
          className="mt-5 block text-sm font-semibold"
          href="mailto:info@alsma-baza.ru"
        >
          info@alsma-baza.ru
        </a>
      </div>
    </div>
    <div className="mx-auto mt-12 max-w-[100rem] border-t border-brand-foreground/15 px-5 pt-6 text-sm text-brand-foreground/50 sm:px-8">
      © 2026 Отель АЛСМА. Все права защищены.
    </div>
  </footer>
);
