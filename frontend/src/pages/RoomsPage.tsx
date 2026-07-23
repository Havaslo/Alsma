import { PublicHero } from "@/components/site/PublicHero";
import { RoomCard } from "@/components/site/RoomCard";
import { RoomsSupportSections } from "@/components/site/RoomsSupportSections";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getSiteCollection } from "@/lib/site/content-collections";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { ROOM_CATEGORIES, ROOM_COMPARISON } from "@/lib/site/rooms";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const RoomsPage = () => {
  const page = PUBLIC_PAGES.rooms;
  const content = usePublishedSiteContent("rooms");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title = typeof hero?.title === "string" ? hero.title : page.title;
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;
  const storedRooms = getSiteCollection(
    content.data?.items,
    "cards",
    ROOM_CATEGORIES,
  );
  const rooms =
    storedRooms.length >= ROOM_CATEGORIES.length
      ? storedRooms
      : ROOM_CATEGORIES;
  const comparisonRooms = rooms.slice(0, 4);
  const comparison = ROOM_COMPARISON;

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        badge="Более 80-ти номеров"
        description={description}
        eyebrow="Номера и коттеджи"
        image={typeof hero?.image === "string" ? hero.image : page.heroImage}
        title={title}
      />
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Варианты размещения
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            От компактных номеров для тихого уикенда до просторного семейного
            размещения.
          </p>
        </div>
        <div className="mt-14 space-y-10">
          {rooms.map((room) => (
            <RoomCard key={room.title} room={room} />
          ))}
        </div>
      </section>
      <section className="bg-panel py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-center font-heading text-4xl font-semibold sm:text-5xl">
            Сравнительная таблица категорий
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-muted-ui-foreground">
            Быстро сравните форматы по количеству гостей, площади, видам и
            особенностям.
          </p>
          <div className="mt-12 overflow-x-auto rounded-3xl border border-line bg-page">
            <table className="w-full min-w-3xl text-left">
              <thead className="bg-brand/10">
                <tr>
                  <th className="p-5">Параметр</th>
                  {comparisonRooms.map((room) => (
                    <th className="p-5" key={room.title}>
                      {room.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr className="border-t border-line" key={row.label}>
                    <th className="p-5 text-brand">{row.label}</th>
                    {row.values.map((value, index) => (
                      <td
                        className="p-5"
                        key={`${row.label}:${comparisonRooms[index]?.title ?? index}`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <RoomsSupportSections rooms={rooms} />
    </main>
  );
};
