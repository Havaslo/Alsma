import type { RoomCategory } from "@/lib/site/rooms";

export type RoomRecommendation = {
  readonly capacity: number;
  readonly room: RoomCategory;
  readonly roomCount: 1 | 2;
};

export const getRoomCapacity = (value: string): number => {
  const combination = value.match(/(\d+)\s*\+\s*(\d+)/u);
  if (combination) return Number(combination[1]) + Number(combination[2]);
  return Math.max(...(value.match(/\d+/gu)?.map(Number) ?? [0]));
};

export const getRequiredRoomCount = (
  capacity: number,
  guestCount: number,
  adultCount: number,
): 1 | 2 | null => {
  if (capacity >= guestCount) return 1;
  if (adultCount >= 2 && capacity * 2 >= guestCount) return 2;
  return null;
};

export const getRecommendedRooms = (
  rooms: readonly RoomCategory[],
  guestCount: number,
  adultCount: number,
  answers: readonly string[],
): RoomRecommendation[] =>
  rooms
    .map((room, index) => {
      const capacity = getRoomCapacity(room.capacity);
      const roomCount = getRequiredRoomCount(capacity, guestCount, adultCount);
      if (!roomCount) return null;

      const roomText =
        `${room.title} ${room.description} ${room.amenities.join(" ")}`.toLocaleLowerCase(
          "ru",
        );
      const area = Number(room.area.match(/\d+/u)?.[0] ?? 0);
      let score = rooms.length - index;

      if (roomCount === 1) score += 2;
      if (
        answers[1] === "romantic" &&
        /балкон|вид|панорам|уедин|приват/u.test(roomText)
      )
        score += 3;
      if (answers[1] === "family" && capacity >= 4) score += 2;
      if (answers[1] === "spa" && roomText.includes("spa")) score += 2;
      if (answers[1] === "quiet" && /уедин|отдельн|тих|спокой/u.test(roomText))
        score += 3;
      if (answers[2] === "view" && /вид|панорам|лес/u.test(roomText))
        score += 3;
      if (answers[2] === "panorama" && /панорам|вид|лес/u.test(roomText))
        score += 3;
      if (answers[2] === "privacy" && /отдельн|уедин|приват/u.test(roomText))
        score += 3;
      if (answers[2] === "space" && area >= 40) score += 3;

      return { capacity, index, room, roomCount, score };
    })
    .filter((recommendation) => recommendation !== null)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 3)
    .map(({ capacity, room, roomCount }) => ({ capacity, room, roomCount }));
