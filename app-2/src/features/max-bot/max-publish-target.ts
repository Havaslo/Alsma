import type { Database } from "../../lib/database/database.js";

// MAX Bot API does not expose a chat list: a chat ID is only delivered in an
// update (for example bot_added) once the bot is added to the channel, so the
// discovered identifier is stored next to the configured one.
export const maxPublishChannelSettingKey = "max.publishChannel";

export type MaxDiscoveredChannel = {
  readonly chatId: string;
  readonly discoveredAt?: string;
  readonly title?: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const readMaxDiscoveredChannel = async (
  database: Database,
): Promise<MaxDiscoveredChannel | null> => {
  const setting = await database.client.appSetting.findUnique({
    select: { value: true },
    where: { key: maxPublishChannelSettingKey },
  });
  const record = asRecord(setting?.value);
  const chatId = typeof record?.chatId === "string" ? record.chatId.trim() : "";
  if (!chatId) return null;
  return {
    chatId,
    discoveredAt:
      typeof record?.discoveredAt === "string"
        ? record.discoveredAt
        : undefined,
    title: typeof record?.title === "string" ? record.title : undefined,
  };
};

export const saveMaxDiscoveredChannel = async (
  database: Database,
  channel: MaxDiscoveredChannel,
): Promise<void> => {
  const value = {
    chatId: channel.chatId,
    discoveredAt: channel.discoveredAt ?? new Date().toISOString(),
    ...(channel.title ? { title: channel.title } : {}),
  };
  await database.client.appSetting.upsert({
    create: { key: maxPublishChannelSettingKey, value },
    update: { value },
    where: { key: maxPublishChannelSettingKey },
  });
};
