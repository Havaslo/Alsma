import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import { MaxApiError, type MaxBotClient } from "../max-bot/max-bot.client.js";
import { VkApiError, type VkClient } from "../vk/vk.client.js";
import { createContentPlanRepository } from "./content-plan.repository.js";

const publishingTimeZone = "Europe/Moscow";
const schedulerIntervalMilliseconds = 15_000;
const stalePublishingMilliseconds = 5 * 60_000;
const maximumImageSize = 50 * 1_024 * 1_024;

type SocialImage = {
  readonly content: Uint8Array;
  readonly contentType: string;
  readonly fileName: string;
};

const formattedPart = (
  date: Date,
  type: Intl.DateTimeFormatPartTypes,
): string =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: publishingTimeZone,
    year: "numeric",
  })
    .formatToParts(date)
    .find((part) => part.type === type)?.value ?? "";

export const getMoscowDateTime = (date: Date) => ({
  date: `${formattedPart(date, "year")}-${formattedPart(date, "month")}-${formattedPart(date, "day")}`,
  time: `${formattedPart(date, "hour")}:${formattedPart(date, "minute")}`,
});

const isFutureInMoscow = (
  scheduledDate: string,
  scheduledTime: string,
  now: Date,
) => {
  const current = getMoscowDateTime(now);
  return (
    `${scheduledDate} ${scheduledTime}` > `${current.date} ${current.time}`
  );
};

const isMaxApiError = (error: unknown): error is MaxApiError =>
  error instanceof Error && error.name === "MaxApiError";
const isVkApiError = (error: unknown): error is VkApiError =>
  error instanceof Error && error.name === "VkApiError";

const isAmbiguousProviderError = (error: unknown) => {
  if (error instanceof TypeError) return true;
  if (error instanceof Error && error.name === "TimeoutError") return true;
  if (isMaxApiError(error)) return error.status >= 500;
  if (isVkApiError(error)) return error.code === 10;
  return false;
};

const safePublicationError = (error: unknown, uncertain: boolean) => {
  if (uncertain)
    return "Платформа не подтвердила результат. Проверьте пост в соцсети перед повтором.";
  if (isVkApiError(error))
    return `VK отклонил публикацию (код ${error.code}). Проверьте права токена, текст и изображения.`;
  if (isMaxApiError(error))
    return `MAX отклонил публикацию (HTTP ${error.status}). Проверьте права бота, канал и изображения.`;
  return "Не удалось подготовить публикацию. Проверьте, что изображения доступны в медиатеке.";
};

export const createContentPlanPublishingService = (options: {
  readonly database: Database;
  readonly enabled: boolean;
  readonly logger: Logger;
  readonly managedStorage: ManagedStorage;
  readonly max: MaxBotClient;
  readonly maxPublishChatId?: string;
  readonly vk: VkClient;
  readonly vkGroupId?: string;
}) => {
  const repository = createContentPlanRepository(options.database);
  let tickInProgress = false;

  const channelStatus = () => ({
    enabled: options.enabled,
    vk: {
      configured: Boolean(options.vk.configured && options.vkGroupId),
    },
    max: {
      configured: options.max.configured,
      targetConfigured: Boolean(options.maxPublishChatId),
    },
  });

  const verifyTarget = async (channel: string) => {
    if (channel === "vk") {
      if (!options.vk.configured || !options.vkGroupId)
        throw new HttpError(
          409,
          "VK_PUBLISHING_NOT_CONFIGURED",
          "Для VK ещё не настроено сообщество и подключение публикации.",
        );
      await options.vk.verifyCredentials(options.vkGroupId);
      return;
    }
    if (channel === "max") {
      if (!options.max.configured || !options.maxPublishChatId)
        throw new HttpError(
          409,
          "MAX_PUBLISH_TARGET_NOT_CONFIGURED",
          "Подключите MAX-бота к нужному каналу с правом публикации, чтобы настроить его как место размещения.",
        );
      try {
        await options.max.verifyChannelPublishing(options.maxPublishChatId);
      } catch (error) {
        if (isMaxApiError(error) && error.status === 403)
          throw new HttpError(
            409,
            "MAX_CHANNEL_WRITE_PERMISSION_REQUIRED",
            "Добавьте MAX-бота администратором канала и выдайте ему право публикации.",
          );
        throw error;
      }
      return;
    }
    throw new HttpError(
      409,
      "CONTENT_PLAN_CHANNEL_NOT_SUPPORTED",
      "Автоматическая публикация пока подключена только для VK и MAX.",
    );
  };

  const schedulePost = async (postId: string) => {
    if (!options.enabled)
      throw new HttpError(
        409,
        "CONTENT_PLAN_PUBLISHING_DISABLED",
        "Запланировать отправку можно после публикации изменений на основном сайте.",
      );
    const post = await repository.findPostForGeneration(postId);
    if (!post)
      throw new HttpError(
        404,
        "CONTENT_PLAN_POST_NOT_FOUND",
        "Публикация не найдена. Обновите календарь.",
      );
    if (!post.generatedCopy.trim())
      throw new HttpError(
        409,
        "CONTENT_PLAN_POST_EMPTY",
        "Перед публикацией добавьте текст поста.",
      );
    if (!["approved", "publish_failed"].includes(post.status))
      throw new HttpError(
        409,
        "CONTENT_PLAN_POST_NOT_SCHEDULABLE",
        "Запланировать можно только одобренный пост. Проверьте его статус и обновите календарь.",
      );
    if (post.channel === "max" && post.generatedCopy.trim().length > 4_000)
      throw new HttpError(
        409,
        "MAX_POST_TEXT_TOO_LONG",
        "Для MAX текст поста должен быть не длиннее 4 000 символов.",
      );
    const imageLimit = post.channel === "max" ? 12 : 10;
    if (post.imageIds.length > imageLimit)
      throw new HttpError(
        409,
        "CONTENT_PLAN_TOO_MANY_IMAGES",
        `Для ${post.channel.toUpperCase()} можно прикрепить не более ${imageLimit} изображений.`,
      );
    if (
      !isFutureInMoscow(
        post.scheduledDate.toISOString().slice(0, 10),
        post.scheduledTime,
        new Date(),
      )
    )
      throw new HttpError(
        409,
        "CONTENT_PLAN_SCHEDULE_IN_PAST",
        "Укажите будущие дату и время, затем снова одобрите пост.",
      );
    await verifyTarget(post.channel);

    const scheduled = await repository.schedulePost(postId);
    if (!scheduled)
      throw new HttpError(
        409,
        "CONTENT_PLAN_POST_NOT_SCHEDULABLE",
        "Запланировать можно только одобренный пост. Проверьте его статус и обновите календарь.",
      );
    return scheduled;
  };

  const loadImages = async (
    imageIds: readonly string[],
  ): Promise<SocialImage[]> => {
    if (imageIds.length === 0) return [];
    const media = await options.database.client.contentFactoryMedia.findMany({
      where: { id: { in: [...new Set(imageIds)] } },
    });
    const mediaById = new Map(media.map((item) => [item.id, item]));
    const images: SocialImage[] = [];
    for (const imageId of imageIds) {
      const item = mediaById.get(imageId);
      if (!item)
        throw new Error(
          "Прикреплённое изображение больше не найдено в медиатеке.",
        );
      if (!item.contentType.startsWith("image/"))
        throw new Error("К посту можно прикреплять только изображения.");
      if (item.sizeBytes > maximumImageSize)
        throw new Error("Размер изображения превышает допустимые 50 МБ.");
      const download = await options.managedStorage.getDownload(item.objectId);
      const response = await fetch(download.downloadUrl, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok)
        throw new Error("Не удалось загрузить прикреплённое изображение.");
      const content = new Uint8Array(await response.arrayBuffer());
      if (content.byteLength > maximumImageSize)
        throw new Error("Размер изображения превышает допустимые 50 МБ.");
      images.push({
        content,
        contentType: item.contentType,
        fileName: item.fileName,
      });
    }
    return images;
  };

  const publishPost = async (postId: string) => {
    const claimed = await repository.claimScheduledPost(postId);
    if (claimed.count === 0) return;
    const post = await repository.findPostForPublishing(postId);
    if (!post) return;

    let providerRequestStarted = false;
    let providerSucceeded = false;
    try {
      await verifyTarget(post.channel);
      const images = await loadImages(post.imageIds);
      providerRequestStarted = true;
      const result =
        post.channel === "vk"
          ? await options.vk.publishWallPost({
              groupId: options.vkGroupId!,
              idempotencyKey: post.id,
              images,
              text: post.generatedCopy,
            })
          : await options.max.publishChannelPost({
              chatId: options.maxPublishChatId!,
              images,
              text: post.generatedCopy,
            });
      providerSucceeded = true;
      const completed = await repository.completePublishing(postId, {
        externalId: result.externalId,
        publishedAt: new Date(),
        url: result.url,
      });
      if (completed.count === 0)
        throw new Error("Publication succeeded but status was not updated");
      options.logger.info(
        { channel: post.channel, postId },
        "Content plan post published",
      );
    } catch (error) {
      const uncertain =
        providerSucceeded ||
        (providerRequestStarted && isAmbiguousProviderError(error));
      const message = safePublicationError(error, uncertain);
      await repository
        .failPublishing(postId, { error: message, uncertain })
        .catch((saveError: unknown) => {
          options.logger.error(
            {
              errorName:
                saveError instanceof Error ? saveError.name : "UnknownError",
              postId,
            },
            "Content plan publication outcome could not be saved",
          );
        });
      options.logger.error(
        {
          channel: post.channel,
          errorName: error instanceof Error ? error.name : "UnknownError",
          outcome: uncertain ? "unknown" : "failed",
          postId,
        },
        "Content plan post publication failed",
      );
    }
  };

  const tick = async () => {
    if (tickInProgress) return;
    tickInProgress = true;
    try {
      await repository.markStalePublishingAsUnknown(
        new Date(Date.now() - stalePublishingMilliseconds),
      );
      const now = getMoscowDateTime(new Date());
      const due = await repository.listDuePostIds(
        new Date(`${now.date}T00:00:00.000Z`),
        now.time,
      );
      for (const { id } of due) await publishPost(id);
    } catch (error) {
      options.logger.error(
        { errorName: error instanceof Error ? error.name : "UnknownError" },
        "Content plan publishing scheduler failed",
      );
    } finally {
      tickInProgress = false;
    }
  };

  const startProductionScheduler = () => {
    const timer = setInterval(() => void tick(), schedulerIntervalMilliseconds);
    timer.unref();
    void tick();
    return () => clearInterval(timer);
  };

  return { channelStatus, schedulePost, startProductionScheduler };
};

export type ContentPlanPublishingService = ReturnType<
  typeof createContentPlanPublishingService
>;
