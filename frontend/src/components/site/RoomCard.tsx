import { Check, Users } from "lucide-react";

import type { RoomCategory } from "@/lib/site/rooms";

export const RoomCard = ({ room }: { readonly room: RoomCategory }) => (
  <article className="overflow-hidden rounded-4xl bg-panel shadow-lg lg:grid lg:grid-cols-2">
    <img
      alt={room.title}
      className="aspect-square size-full object-cover"
      src={room.image}
    />
    <div className="flex flex-col p-7 sm:p-10">
      <div className="flex flex-wrap gap-2 text-sm font-semibold text-brand">
        <span className="rounded-full bg-brand/10 px-3 py-2">{room.area}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-2">
          <Users className="size-4" /> {room.capacity}
        </span>
        <span className="rounded-full bg-brand/10 px-3 py-2">{room.beds}</span>
      </div>
      <h2 className="mt-6 font-heading text-4xl font-semibold">{room.title}</h2>
      <p className="mt-4 leading-7 text-muted-ui-foreground">
        {room.description}
      </p>
      <p className="mt-7 text-sm font-semibold tracking-wide text-muted-ui-foreground uppercase">
        Оснащение номера
      </p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {room.amenities.map((amenity) => (
          <li className="flex items-center gap-3" key={amenity}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/10">
              <Check className="size-4 text-brand" />
            </span>
            {amenity}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
        <p className="w-full text-2xl font-semibold">
          {room.price} <span className="text-base font-normal">/ ночь</span>
        </p>
        <a
          className="rounded-full border border-brand/15 bg-page px-6 py-3 font-semibold text-brand"
          href="/#booking"
        >
          Проверить даты
        </a>
        <a
          className="rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
          href="/#booking"
        >
          Перейти к бронированию
        </a>
      </div>
    </div>
  </article>
);
