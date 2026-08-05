import { Check, Users } from "lucide-react";

import { RoomGallery } from "@/components/site/RoomGallery";
import type { RoomCategory } from "@/lib/site/rooms";

export const RoomCard = ({ room }: { readonly room: RoomCategory }) => (
  <article className="overflow-hidden rounded-4xl bg-panel shadow-lg lg:grid lg:grid-cols-2">
    <RoomGallery images={room.gallery ?? [room.image]} title={room.title} />
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
      {room.features && room.features.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {room.features.map((feature) => (
            <span
              className="rounded-full border border-brand/15 px-3 py-1.5 text-sm text-muted-ui-foreground"
              key={feature}
            >
              {feature}
            </span>
          ))}
        </div>
      )}
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
      <div className="mt-auto pt-8">
        <p className="text-2xl font-semibold">
          {room.price} <span className="text-base font-normal">/ ночь</span>
        </p>
      </div>
    </div>
  </article>
);
