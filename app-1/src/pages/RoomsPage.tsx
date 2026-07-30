import { PublicHero } from "@/components/site/PublicHero";
import { RoomCard } from "@/components/site/RoomCard";
import { RoomsSupportSections } from "@/components/site/RoomsSupportSections";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { getRoomComparisonValue, getRoomId } from "@/lib/site/rooms";
import { getRoomCards, getRoomComparison } from "@/lib/site/rooms-content";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const RoomsPage = () => {
  const page = PUBLIC_PAGES.rooms;
  const content = usePublishedSiteContent("rooms");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title = typeof hero?.title === "string" ? hero.title : page.title;
  const description = page.description;
  const rooms = getRoomCards(content.data?.items)
    .filter((room) => room.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const comparisonContent = getRoomComparison(content.data?.items, rooms);
  const comparisonRooms = comparisonContent.selectedRoomIds
    .map((roomId) => rooms.find((room) => room.id === roomId))
    .filter((room) => room !== undefined);
  const comparison = comparisonContent.items
    .filter((row) => row.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        badge="Более 80 номеров"
        description={description}
        eyebrow="Номера и коттеджи"
        image={page.heroImage}
        title={title}
      />
      <section
        className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8"
        id="details"
      >
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
          {rooms.map((room, index) => (
            <RoomCard key={getRoomId(room, index)} room={room} />
          ))}
        </div>
      </section>
      <section className="bg-panel py-24">
        <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
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
                    {comparisonRooms.map((room, index) => {
                      const roomId = getRoomId(room, index);
                      const value = getRoomComparisonValue(
                        row.values,
                        roomId,
                        index,
                      );
                      return (
                        <td className="p-5" key={`${row.label}:${roomId}`}>
                          {value}
                        </td>
                      );
                    })}
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
