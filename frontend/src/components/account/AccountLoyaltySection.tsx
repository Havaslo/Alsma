import { Clock3, Percent, Star } from "lucide-react";

import type { GuestProfile } from "@/lib/auth/guest-auth-api";

const benefits = [
  {
    description: "Постоянная скидка 10% на бронирования на сайте.",
    icon: Percent,
    title: "Скидка на проживание",
  },
  {
    description: "Поздний выезд при наличии свободных номеров.",
    icon: Clock3,
    title: "Поздний выезд",
  },
  {
    description: "Ранний доступ к сезонным предложениям и пакетам.",
    icon: Star,
    title: "Приоритет в акциях",
  },
] as const;

export const AccountLoyaltySection = ({
  bonusProgram,
}: {
  bonusProgram: GuestProfile["bonusProgram"];
}) => (
  <section className="mt-8">
    <h2 className="font-heading text-3xl font-semibold text-brand">
      Бонусы и скидки
    </h2>
    <article className="to-accent mt-7 rounded-4xl bg-gradient-to-r from-brand via-supporting p-7 text-brand-foreground shadow-xl sm:p-10">
      <div className="flex flex-col justify-between gap-8 sm:flex-row">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase opacity-70">
            Программа лояльности
          </p>
          <p className="mt-3 text-4xl font-semibold">
            {bonusProgram?.level ?? "Silver"}
          </p>
          <p className="mt-3">Текущая скидка: 10%</p>
        </div>
        <div className="sm:text-right">
          <p className="rounded-full border border-brand-foreground/30 px-5 py-2">
            Следующий уровень: Gold
          </p>
          <p className="mt-4 text-sm opacity-75">
            До уровня Gold осталось 3 заезда
          </p>
        </div>
      </div>
      <p className="mt-8 text-3xl font-semibold">68%</p>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-brand-foreground/25">
        <div className="h-full w-[68%] rounded-full bg-panel" />
      </div>
    </article>
    <div className="mt-6 grid gap-5 md:grid-cols-3">
      {[
        ["Заездов", "12"],
        ["Бонусных баллов", String(bonusProgram?.balance ?? 2_400)],
        ["Сэкономлено", "48 300 ₽"],
      ].map(([label, value]) => (
        <div
          className="rounded-3xl border border-line bg-panel p-6"
          key={label}
        >
          <p className="text-xs tracking-wider text-muted-ui-foreground uppercase">
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold text-brand">{value}</p>
        </div>
      ))}
    </div>
    <article className="mt-6 rounded-4xl border border-line bg-panel p-7">
      <h3 className="font-heading text-2xl font-semibold text-brand">
        Преимущества текущего уровня
      </h3>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {benefits.map(({ description, icon: Icon, title }) => (
          <div className="rounded-3xl border border-line p-5" key={title}>
            <div className="grid size-12 place-items-center rounded-full bg-page text-brand">
              <Icon className="size-5" />
            </div>
            <h4 className="mt-5 text-lg font-semibold text-brand">{title}</h4>
            <p className="mt-3 leading-6 text-muted-ui-foreground">
              {description}
            </p>
          </div>
        ))}
      </div>
    </article>
  </section>
);
