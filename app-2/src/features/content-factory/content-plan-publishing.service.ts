import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import type { InstagramPublishingService } from "../instagram-publishing/instagram-publishing.service.js";
import { MaxApiError, type MaxBotClient } from "../max-bot/max-bot.client.js";
import { readMaxDiscoveredChannel } from "../max-bot/max-publish-target.js";
import {
  TelegramApiError,
  type TelegramBotClient,
} from "../telegram/telegram-bot.client.js";
import { VkApiError, type VkClient } from "../vk/vk.client.js";
import { createContentPlanBlogPublisher } from "./content-plan-blog-publisher.js";
import {
  isAmbiguousProviderError,
  safePublicationError,
} from "./content-plan-publication-errors.js";
import { getMoscowDateTime, isFutureInMoscow } from "./content-plan-time.js";
import { createContentPlanRepository } from "./content-plan.repository.js";

const schedulerIntervalMilliseconds = 15_000;
const stalePublishingMilliseconds = 5 * 60_000;
const maximumImageSize = 50 * 1_024 * 1_024;
const maximumTelegramTextLength = 4_096;

const deliveryChannel = (channel: string) =>
  channel === "zen" ? "telegram" : channel;

type SocialImage = {
  readonly content: Uint8Array;
  readonly contentType: string;
  readonly downloadUrl: string;
  readonly fileName: string;
  readonly objectId: string;
};

const isMaxApiError = (error: unknown): error is MaxApiError =>
  error instanceof Error && error.name === "MaxApiError";
const isVkApiError = (error: unknown): error is VkApiError =>
  error instanceof Error && error.name === "VkApiError";
const isTelegramApiError = (error: unknown): error is TelegramApiError =>
  error instanceof TelegramApiError;

export const createContentPlanPublishingService = (options: {
  readonly database: Database;
  readonly enabled: boolean;
  readonly instagram: InstagramPublishingService;
  readonly logger: Logger;
  readonly managedStorage: ManagedStorage;
  readonly max: MaxBotClient;
  readonly maxPublishChatId?: string;
  readonly telegram: TelegramBotClient;
  readonly telegramPublishChatId?: string;
  readonly vk: VkClient;
  readonly vkGroupId?: string;
}) => {
  const repository = createContentPlanRepository(options.database);
  const publishBlogPost = createContentPlanBlogPublisher(options.database);
  let tickInProgress = false;
  // MAX reports a chat_id only through the bot_added update, so the channel
  // discovered there is used when the configured ID is unknown or stale.
  let resolvedMaxPublishChatId: string | null = null;

  const maxPublishChatIdCandidates = async (): Promise<string[]> => {
    const discovered = await readMaxDiscoveredChannel(options.database).catch(
      (error: unknown) => {
        options.logger.warn(
          { error: error instanceof Error ? error.message : "UnknownError" },
          "MAX discovered channel could not be read",
        );
        return null;
      },
    );
    const candidates = [options.maxPublishChatId, discovered?.chatId]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
    return [...new Set(candidates)];
  };

  const channelStatus = async () => ({
    enabled: options.enabled,
    vk: {
      configured: Boolean(options.vk.configured && options.vkGroupId),
    },
    max: {
      configured: options.max.configured,
      targetConfigured: (await maxPublishChatIdCandidates()).length > 0,
    },
    telegram: {
      configured: options.telegram.configured,
      targetConfigured: Boolean(options.telegramPublishChatId),
    },
    instagram: {
      configured: (await options.instagram.status()).connected,
    },
    blog: { configured: true },
  });

  const verifyTarget = async (channel: string) => {
    const targetChannel = deliveryChannel(channel);
    if (targetChannel !== channel) return verifyTarget(targetChannel);
    if (channel === "vk") {
      if (!options.vk.configured || !options.vkGroupId)
        throw new HttpError(
          409,
          "VK_PUBLISHING_NOT_CONFIGURED",
          "Для VK ещё не настроено сообщество и подключение публикации.",
        );
      try {
        await options.vk.verifyCredentials(options.vkGroupId);
        await options.vk.verifyPublishingRights(options.vkGroupId);
      } catch (error) {
        if (isVkApiError(error) && error.code === 27)
          throw new HttpError(
            409,
            "VK_PUBLISH_PERMISSION_REQUIRED",
            error.message.includes("community token")
              ? "У подключённого токена сообщества VK нет права wall. Создайте новый токен сообщества с правом публикации и обновите подключение VK."
              : error.message.includes("wall or manage")
                ? "У подключённого токена VK нет прав публикации в сообщество. Нужны права wall и manage, а для картинок — photos; создайте новый токен и обновите подключение VK."
                : "VK не разрешает публикацию в это сообщество. Подключите токен с правами управления сообществом (manage) и публикации (wall) или токен сообщества с правом wall.",
          );
        if (isVkApiError(error) && (error.code === 5 || error.code === 15))
          throw new HttpError(
            409,
            "VK_TOKEN_INVALID",
            "VK не принял сохранённый токен. Обновите подключение VK и повторите публикацию.",
          );
        options.logger.warn(
          {
            errorName: error instanceof Error ? error.name : "UnknownError",
            vkCode: isVkApiError(error) ? error.code : null,
          },
          "VK target verification failed",
        );
        throw new HttpError(
          502,
          "VK_CHECK_FAILED",
          "Не удалось проверить сообщество VK. Пост не добавлен в очередь; повторите позже.",
        );
      }
      return;
    }
    if (channel === "max") {
      if (!options.max.configured)
        throw new HttpError(
          409,
          "MAX_PUBLISH_TARGET_NOT_CONFIGURED",
          "Подключите MAX-бота к нужному каналу с правом публикации, чтобы настроить его как место размещения.",
        );
      const candidates = await maxPublishChatIdCandidates();
      if (candidates.length === 0)
        throw new HttpError(
          409,
          "MAX_PUBLISH_TARGET_NOT_CONFIGURED",
          "Подключите MAX-бота к нужному каналу с правом публикации, чтобы настроить его как место размещения.",
        );
      let error: unknown;
      for (const candidate of candidates) {
        try {
          await options.max.verifyChannelPublishing(candidate);
          resolvedMaxPublishChatId = candidate;
          return;
        } catch (candidateError) {
          error = candidateError;
          // A stale configured ID is skipped in favour of a channel that the
          // bot reported itself through a bot_added update.
          if (!(isMaxApiError(candidateError) && candidateError.status === 404))
            break;
        }
      }
      if (error !== undefined) {
        if (isMaxApiError(error) && error.status === 403)
          throw new HttpError(
            409,
            "MAX_CHANNEL_WRITE_PERMISSION_REQUIRED",
            "Добавьте MAX-бота администратором канала и выдайте ему право публикации.",
          );
        if (isMaxApiError(error) && error.status === 409)
          throw new HttpError(
            409,
            "MAX_CHANNEL_INVALID",
            "MAX не подтвердил, что указанная цель — активный канал или групповой чат. Проверьте адрес и права бота.",
          );
        if (isMaxApiError(error) && error.status === 404)
          throw new HttpError(
            409,
            "MAX_PUBLISH_TARGET_NOT_FOUND",
            "MAX не нашёл указанный канал. Добавьте MAX-бота в канал с правом публикации — сервис определит канал автоматически после добавления бота.",
          );
        const networkCause = error instanceof Error ? error.cause : undefined;
        options.logger.warn(
          {
            errorName: error instanceof Error ? error.name : "UnknownError",
            maxStatus: isMaxApiError(error) ? error.status : null,
            maxErrorKind: isMaxApiError(error)
              ? "http"
              : error instanceof TypeError
                ? "network"
                : "unknown",
            maxNetworkCode:
              networkCause &&
              typeof networkCause === "object" &&
              "code" in networkCause &&
              typeof networkCause.code === "string"
                ? networkCause.code
                : null,
          },
          "MAX target verification failed",
        );
        throw new HttpError(
          502,
          "MAX_CHECK_FAILED",
          "Не удалось связаться с MAX для проверки канала. Пост не добавлен в очередь; повторите позже.",
        );
      }
      return;
    }
    if (channel === "telegram") {
      if (!options.telegram.configured || !options.telegramPublishChatId)
        throw new HttpError(
          409,
          "TELEGRAM_PUBLISH_TARGET_NOT_CONFIGURED",
          "Настройте Telegram-бота и адрес целевого канала перед публикацией.",
        );
      try {
        await options.telegram.verifyChannelPublishing(
          options.telegramPublishChatId,
        );
      } catch (error) {
        if (isTelegramApiError(error) && error.status === 401)
          throw new HttpError(
            409,
            "TELEGRAM_BOT_TOKEN_INVALID",
            "Telegram не принял токен бота. Проверьте подключённый токен.",
          );
        if (isTelegramApiError(error) && error.status === 403)
          throw new HttpError(
            409,
            "TELEGRAM_CHANNEL_WRITE_PERMISSION_REQUIRED",
            "Добавьте Telegram-бота администратором канала с правом публикации.",
          );
        if (
          isTelegramApiError(error) &&
          (error.status === 400 || error.status === 409)
        )
          throw new HttpError(
            409,
            "TELEGRAM_PUBLISH_TARGET_INVALID",
            "Проверьте адрес канала и добавление бота в целевой канал или группу.",
          );
        options.logger.warn(
          {
            errorName: error instanceof Error ? error.name : "UnknownError",
            telegramStatus: isTelegramApiError(error) ? error.status : null,
          },
          "Telegram target verification failed",
        );
        throw new HttpError(
          502,
          "TELEGRAM_VERIFICATION_FAILED",
          "Не удалось проверить Telegram-канал. Пост не добавлен в очередь. Проверьте подключение и повторите позже.",
        );
      }
      return;
    }
    if (channel === "instagram") {
      try {
        await options.instagram.verifyConnection();
      } catch (error) {
        if (error instanceof HttpError) throw error;
        options.logger.warn(
          {
            errorName: error instanceof Error ? error.name : "UnknownError",
          },
          "Instagram target verification failed",
        );
        throw new HttpError(
          502,
          "INSTAGRAM_CHECK_FAILED",
          "Не удалось проверить подключение Instagram. Пост не добавлен в очередь; повторите позже.",
        );
      }
      return;
    }
    if (channel === "blog") return;
    throw new HttpError(
      409,
      "CONTENT_PLAN_CHANNEL_NOT_SUPPORTED",
      "Автоматическая публикация пока подключена только для VK, MAX, Telegram, Instagram и блога.",
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
    if (
      post.channel === "zen" &&
      post.generatedCopy.trim().length > maximumTelegramTextLength
    )
      throw new HttpError(
        409,
        "ZEN_TELEGRAM_CROSSPOST_TEXT_TOO_LONG",
        "Связка с Дзена публикует через Telegram. Сократите текст до 4 096 символов для отправки.",
      );
    if (post.channel === "instagram") {
      if (post.generatedCopy.trim().length > 2_200)
        throw new HttpError(
          409,
          "INSTAGRAM_POST_TEXT_TOO_LONG",
          "Для Instagram текст поста должен быть не длиннее 2 200 символов.",
        );
      if (post.imageIds.length === 0)
        throw new HttpError(
          409,
          "INSTAGRAM_IMAGE_REQUIRED",
          "Для публикации в Instagram добавьте хотя бы одно изображение.",
        );
    }
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

    const scheduled = await repository.schedulePost(
      postId,
      deliveryChannel(post.channel),
    );
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
        downloadUrl: download.downloadUrl,
        fileName: item.fileName,
        objectId: item.objectId,
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
      const targetChannel = deliveryChannel(post.channel);
      await verifyTarget(targetChannel);
      const images = await loadImages(post.imageIds);
      providerRequestStarted = true;
      const result =
        targetChannel === "vk"
          ? await options.vk
              .publishWallPost({
                groupId: options.vkGroupId!,
                idempotencyKey: post.id,
                images,
                text: post.generatedCopy,
              })
              .then((published) => {
                if (published.skippedImages > 0)
                  options.logger.warn(
                    {
                      channel: post.channel,
                      postId,
                      vkSkippedImages: published.skippedImages,
                    },
                    "VK post published without images",
                  );
                return published;
              })
          : targetChannel === "max"
            ? await options.max.publishChannelPost({
                chatId: resolvedMaxPublishChatId ?? options.maxPublishChatId!,
                images,
                text: post.generatedCopy,
              })
            : targetChannel === "telegram"
              ? await options.telegram.publishChannelPost({
                  chatId: options.telegramPublishChatId!,
                  images,
                  text: post.generatedCopy,
                })
              : targetChannel === "instagram"
                ? await options.instagram.publish({
                    images,
                    text: post.generatedCopy,
                  })
                : await publishBlogPost(post);
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
