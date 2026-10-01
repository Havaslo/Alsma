import assert from "node:assert/strict";
import test from "node:test";

import {
  getRecommendedRooms,
  getRequiredRoomCount,
  getRoomCapacity,
} from "@/lib/site/room-recommendations";
import type { RoomCategory } from "@/lib/site/rooms";

const room = (title: string, capacity: string): RoomCategory => ({
  amenities: [],
  area: "24 м²",
  beds: "Кровать",
  capacity,
  description: "Номер для отдыха.",
  image: "room.jpg",
  price: "от 10 000 ₽",
  title,
});

test("parses room capacity, including a 2+1 sleeping arrangement", () => {
  assert.equal(getRoomCapacity("до 4 взрослых"), 4);
  assert.equal(getRoomCapacity("2+1"), 3);
  assert.equal(getRoomCapacity("2–4 гостя"), 4);
  assert.equal(getRoomCapacity("16–32 гостя"), 32);
});

test("calculates whether one or two rooms can fit the selected party", () => {
  assert.equal(getRequiredRoomCount(4, 4, 2), 1);
  assert.equal(getRequiredRoomCount(4, 6, 2), 2);
  assert.equal(getRequiredRoomCount(4, 6, 1), null);
  assert.equal(getRequiredRoomCount(4, 9, 2), null);
});

test("only recommends rooms that fit the selected guest count", () => {
  const recommendations = getRecommendedRooms(
    [room("Стандарт", "2 гостя"), room("Люкс", "до 4 взрослых")],
    4,
    2,
    ["", "family", ""],
  );

  assert.deepEqual(
    recommendations.map(({ room: item, roomCount }) => ({
      title: item.title,
      roomCount,
    })),
    [
      { title: "Люкс", roomCount: 1 },
      { title: "Стандарт", roomCount: 2 },
    ],
  );
});

test("recommends two rooms for a party that cannot fit in one room", () => {
  const recommendations = getRecommendedRooms(
    [room("Полулюкс", "до 4 взрослых")],
    6,
    2,
    ["", "family", ""],
  );

  assert.equal(recommendations[0]?.roomCount, 2);
});

test("uses the chosen vacation style to rank suitable rooms", () => {
  const rooms = [
    room("Обычный номер", "2 гостя"),
    {
      ...room("Номер с видом", "2 гостя"),
      description: "Балкон и вид на лес.",
    },
    {
      ...room("Уединённый номер", "2 гостя"),
      description: "Отдельный вход для тихого уединения.",
    },
  ];

  const romantic = getRecommendedRooms(rooms, 2, 2, ["", "romantic", ""]);
  const quiet = getRecommendedRooms(rooms, 2, 2, ["", "quiet", ""]);

  assert.equal(romantic[0]?.room.title, "Номер с видом");
  assert.equal(quiet[0]?.room.title, "Уединённый номер");
});
