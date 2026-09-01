type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : null;

const number = (record: RecordValue, key: string): number =>
  typeof record[key] === "number" ? record[key] : Number(record[key]);

export type RoomDefinition = {
  readonly imageUrls: readonly string[];
  readonly area: number | null;
  readonly count: number | null;
  readonly capacity: number | null;
  readonly description: string | null;
  readonly bedOptions: string | null;
};

const readImageUrls = (room: RecordValue): string[] => {
  const values = [
    room["room-image-urls"],
    room["room-images"],
    room.images,
    room.gallery,
  ];
  const urls = values.flatMap((value) => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (typeof item === "string") return [item];
      const record = asRecord(item);
      const url = record?.url ?? record?.["image-url"];
      return typeof url === "string" ? [url] : [];
    });
  });
  const primary = room["room-image-url"];
  return Array.from(
    new Set(
      [...(typeof primary === "string" ? [primary] : []), ...urls].filter(
        Boolean,
      ),
    ),
  );
};

export const readDefinitions = (
  payload: unknown,
): Map<number, RoomDefinition> => {
  const response = asRecord(payload);
  const items = response?.roomtype;
  if (!Array.isArray(items)) return new Map();
  return new Map(
    items.flatMap((item) => {
      const room = asRecord(item);
      if (!room) return [];
      const id = number(room, "room-id");
      if (!Number.isInteger(id) || id < 1) return [];
      const rules = asRecord(room["room-rules"]);
      const readNullableNumber = (key: string) => {
        const value = room[key];
        return typeof value === "number" && Number.isFinite(value)
          ? value
          : null;
      };
      const count =
        ["room-count", "room-counts", "number-of-rooms"]
          .map((key) => readNullableNumber(key))
          .find((value) => value !== null) ?? null;
      return [
        [
          id,
          {
            imageUrls: readImageUrls(room),
            area: readNullableNumber("room-area"),
            count,
            capacity: rules ? Number(rules["max-pax-capacity"]) || null : null,
            description:
              typeof room["room-property"] === "string"
                ? room["room-property"]
                : null,
            bedOptions:
              typeof room["room-bed-options"] === "string"
                ? room["room-bed-options"]
                : null,
          } satisfies RoomDefinition,
        ],
      ] as const;
    }),
  );
};
