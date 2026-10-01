export type RoomGuestCounts = {
  readonly adults: number;
  readonly children: number;
};

export const distributeBookingGuests = (
  adults: number,
  children: number,
  roomCount: number,
): RoomGuestCounts[] => {
  const safeRoomCount = Math.max(1, Math.min(2, Math.trunc(roomCount)));
  return Array.from({ length: safeRoomCount }, (_, index) => ({
    adults:
      Math.floor(adults / safeRoomCount) +
      (index < adults % safeRoomCount ? 1 : 0),
    children:
      Math.floor(children / safeRoomCount) +
      (index < children % safeRoomCount ? 1 : 0),
  }));
};
