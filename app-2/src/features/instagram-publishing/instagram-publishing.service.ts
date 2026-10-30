import { createCanvas, loadImage } from "@napi-rs/canvas";
import { randomUUID } from "node:crypto";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import { decryptInstagramToken } from "./instagram-connection.service.js";
import {
  type InstagramGraphConfiguration,
  MetaGraphRequestError,
  createInstagramGraphClient,
} from "./instagram-graph.client.js";

const captionLimit = 2_200;
const carouselItemLimit = 10;
const containerPollIntervalMilliseconds = 2_000;
const containerWaitMilliseconds = 90_000;
// Meta rejects feed images outside 4:5 … 1.91:1 with a generic
// "could not download the image" error, so every upload is cropped in range.
const minFeedAspect = 4 / 5;
const maxFeedAspect = 1.91;

export type InstagramPublishImage = {
  readonly content: Uint8Array;
  readonly contentType: string;
  readonly downloadUrl?: string;
  readonly fileName: string;
  readonly objectId?: string;
};

export class InstagramPublishError extends Error {
  constructor(
    readonly cause: unknown,
    readonly uncertain: boolean,
  ) {
    super("Instagram publication failed");
    this.name = "InstagramPublishError";
  }
}

export const isInstagramPublishError = (
  error: unknown,
): error is InstagramPublishError =>
  error instanceof Error && error.name === "InstagramPublishError";

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const providerCodeOf = (error: unknown): number | null =>
  error instanceof MetaGraphRequestError ? error.providerCode : null;

const httpStatusOf = (error: unknown): number | null =>
  error instanceof MetaGraphRequestError ? error.httpStatus : null;

// Public media URLs are built as `${origin}/api/media/managed/${token}`.
// The configured value is usually the API base of the backend, so a trailing
// `/api` segment has to be removed; otherwise Meta receives `/api/api/...`
// and answers with "Only photo or video can be accepted as media type".
export const resolvePublicMediaBaseUrl = (
  value: string | undefined,
): string | undefined => {
  let base = value?.trim().replace(/\/+$/u, "");
  if (!base) return undefined;
  while (/\/api$/iu.test(base)) base = base.replace(/\/api$/iu, "");
  return base || undefined;
};

export const createInstagramPublishingService = (options: {
  readonly configuration: InstagramGraphConfiguration & {
    readonly publicMediaBaseUrl?: string;
    readonly tokenEncryptionKey?: string;
  };
  readonly database: Database;
  readonly fetchImplementation?: typeof fetch;
  readonly logger: Logger;
  readonly managedStorage: ManagedStorage;
}) => {
  const configuration = options.configuration;
  const graph = createInstagramGraphClient({
    configuration,
    fetchImplementation: options.fetchImplementation,
    logger: options.logger,
  });

  const publishingConfigured = Boolean(
    configuration.proxyUrl &&
    configuration.proxyKey &&
    configuration.tokenEncryptionKey,
  );

  const findConnection = () =>
    options.database.client.instagramChannelConnection.findUnique({
      select: {
        connectedAt: true,
        encryptedAccessToken: true,
        instagramUserId: true,
        tokenExpiresAt: true,
        username: true,
      },
      where: { provider: "instagram" },
    });

  const status = async () => {
    const connection = await findConnection();
    const expired = Boolean(
      connection?.tokenExpiresAt && connection.tokenExpiresAt <= new Date(),
    );
    return {
      configured: publishingConfigured,
      connected: Boolean(connection && !expired),
      needsReconnect: Boolean(connection && expired),
      username: connection?.username ?? null,
      connectedAt: connection?.connectedAt?.toISOString() ?? null,
    };
  };

  const verifyTarget = async () => {
    if (!publishingConfigured)
      throw new HttpError(
        409,
        "INSTAGRAM_PUBLISHING_NOT_CONFIGURED",
        "Автоматическая публикация в Instagram ещё не настроена на сервере.",
      );
    const connection = await findConnection();
    if (!connection)
      throw new HttpError(
        409,
        "INSTAGRAM_NOT_CONNECTED",
        "Подключите Instagram-аккаунт в разделе «Фабрика контента», чтобы публиковать посты.",
      );
    if (connection.tokenExpiresAt && connection.tokenExpiresAt <= new Date())
      throw new HttpError(
        409,
        "INSTAGRAM_RECONNECT_REQUIRED",
        "Срок действия подключения Instagram истёк. Переподключите аккаунт и повторите публикацию.",
      );
    return {
      accessToken: decryptInstagramToken(
        connection.encryptedAccessToken,
        configuration.tokenEncryptionKey!,
      ),
      instagramUserId: connection.instagramUserId,
      username: connection.username,
    };
  };

  const verifyConnection = async () => {
    const target = await verifyTarget();
    try {
      await graph.get(target.instagramUserId, target.accessToken, {
        fields: "id,username",
      });
      return target;
    } catch (error) {
      const code = providerCodeOf(error);
      if (code === 190 || httpStatusOf(error) === 401)
        throw new HttpError(
          409,
          "INSTAGRAM_RECONNECT_REQUIRED",
          "Instagram больше не принимает сохранённый доступ. Переподключите аккаунт и повторите публикацию.",
        );
      if (code === 10 || code === 200)
        throw new HttpError(
          409,
          "INSTAGRAM_PUBLISH_PERMISSION_REQUIRED",
          "У приложения Meta нет права публикации в Instagram. Проверьте разрешение instagram_content_publish и подключите аккаунт заново.",
        );
      options.logger.warn(
        {
          httpStatus: httpStatusOf(error),
          providerCode: code,
          stage: "connection_check",
        },
        "Instagram connection check failed",
      );
      throw new HttpError(
        502,
        "INSTAGRAM_CHECK_FAILED",
        "Не удалось проверить подключение Instagram. Пост не добавлен в очередь; повторите позже.",
      );
    }
  };

  const publicMediaUrl = (objectId: string) => {
    const base = resolvePublicMediaBaseUrl(configuration.publicMediaBaseUrl);
    if (!base) return undefined;
    const token = Buffer.from(objectId, "utf8").toString("base64url");
    return `${base}/api/media/managed/${token}`;
  };

  const normalizeForFeed = async (
    image: InstagramPublishImage,
  ): Promise<{ readonly changed: boolean; readonly content: Uint8Array }> => {
    let source;
    try {
      source = await loadImage(Buffer.from(image.content));
    } catch {
      // The bytes could not be decoded; let Meta decide instead of failing here.
      return { changed: false, content: image.content };
    }
    const aspect = source.width / source.height;
    const fitsFeed =
      aspect >= minFeedAspect - 1e-3 && aspect <= maxFeedAspect + 1e-3;
    if (fitsFeed && image.contentType === "image/jpeg")
      return { changed: false, content: image.content };
    let sourceX = 0;
    let sourceY = 0;
    let width = source.width;
    let height = source.height;
    if (aspect < minFeedAspect) {
      height = Math.max(1, Math.round(source.width / minFeedAspect));
      sourceY = Math.max(0, Math.round((source.height - height) / 2));
    } else if (aspect > maxFeedAspect) {
      width = Math.max(1, Math.round(source.height * maxFeedAspect));
      sourceX = Math.max(0, Math.round((source.width - width) / 2));
    }
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(
      source,
      sourceX,
      sourceY,
      width,
      height,
      0,
      0,
      width,
      height,
    );
    return {
      changed: true,
      content: new Uint8Array(canvas.toBuffer("image/jpeg", 0.92)),
    };
  };

  const prepareMedia = async (images: readonly InstagramPublishImage[]) => {
    const temporaryObjectIds: string[] = [];
    const urls: string[] = [];
    for (const image of images) {
      const normalized = await normalizeForFeed(image);
      const directUrl = image.objectId
        ? publicMediaUrl(image.objectId)
        : undefined;
      const reusableUrl = directUrl ?? image.downloadUrl;
      if (!normalized.changed && reusableUrl) {
        urls.push(reusableUrl);
        continue;
      }
      const uploaded = await options.managedStorage.upload({
        content: normalized.content,
        contentType: "image/jpeg",
        name: `instagram-${randomUUID()}.jpg`,
      });
      temporaryObjectIds.push(uploaded.objectId);
      const uploadedUrl = publicMediaUrl(uploaded.objectId);
      if (uploadedUrl) {
        urls.push(uploadedUrl);
        continue;
      }
      const download = await options.managedStorage.getDownload(
        uploaded.objectId,
      );
      urls.push(download.downloadUrl);
    }
    return {
      urls,
      cleanup: async () => {
        for (const objectId of temporaryObjectIds)
          await options.managedStorage.deleteObject(objectId).catch(() => {
            options.logger.warn(
              { stage: "temporary_media_cleanup" },
              "Instagram temporary image could not be removed",
            );
          });
      },
    };
  };

  const containerId = (payload: Record<string, unknown>) => {
    const id = payload.id;
    if (typeof id === "string" && id.trim()) return id;
    if (typeof id === "number") return String(id);
    throw new Error("Instagram did not return a media container ID");
  };

  const waitForContainer = async (
    id: string,
    accessToken: string,
  ): Promise<void> => {
    const deadline = Date.now() + containerWaitMilliseconds;
    while (Date.now() < deadline) {
      const payload = await graph.get(id, accessToken, {
        fields: "status_code,status",
      });
      const statusCode =
        typeof payload.status_code === "string" ? payload.status_code : "";
      if (statusCode === "FINISHED" || statusCode === "PUBLISHED") return;
      if (statusCode === "ERROR" || statusCode === "EXPIRED")
        throw new MetaGraphRequestError(
          422,
          null,
          typeof payload.status === "string" ? payload.status : null,
        );
      await wait(containerPollIntervalMilliseconds);
    }
    throw new MetaGraphRequestError(
      504,
      null,
      "Instagram did not finish processing the image in time",
    );
  };

  const publish = async (input: {
    readonly images: readonly InstagramPublishImage[];
    readonly text: string;
  }) => {
    const caption = input.text.trim();
    if (!caption)
      throw new HttpError(
        409,
        "INSTAGRAM_POST_TEXT_EMPTY",
        "Добавьте текст поста перед публикацией в Instagram.",
      );
    if (caption.length > captionLimit)
      throw new HttpError(
        409,
        "INSTAGRAM_POST_TEXT_TOO_LONG",
        `Для Instagram текст должен быть не длиннее ${captionLimit} символов.`,
      );
    if (input.images.length === 0)
      throw new HttpError(
        409,
        "INSTAGRAM_IMAGE_REQUIRED",
        "Для публикации в Instagram добавьте хотя бы одно изображение.",
      );
    if (input.images.length > carouselItemLimit)
      throw new HttpError(
        409,
        "INSTAGRAM_TOO_MANY_IMAGES",
        `В Instagram можно добавить не более ${carouselItemLimit} изображений.`,
      );

    const target = await verifyTarget();
    const media = await prepareMedia(input.images);
    try {
      let creationId: string;
      if (media.urls.length === 1) {
        creationId = containerId(
          await graph.post(
            `${target.instagramUserId}/media`,
            target.accessToken,
            { image_url: media.urls[0]!, caption },
          ),
        );
        await waitForContainer(creationId, target.accessToken);
      } else {
        const children: string[] = [];
        for (const url of media.urls)
          children.push(
            containerId(
              await graph.post(
                `${target.instagramUserId}/media`,
                target.accessToken,
                { image_url: url, is_carousel_item: "true" },
              ),
            ),
          );
        for (const child of children)
          await waitForContainer(child, target.accessToken);
        creationId = containerId(
          await graph.post(
            `${target.instagramUserId}/media`,
            target.accessToken,
            {
              caption,
              children: children.join(","),
              media_type: "CAROUSEL",
            },
          ),
        );
        await waitForContainer(creationId, target.accessToken);
      }

      let published: Record<string, unknown>;
      try {
        published = await graph.post(
          `${target.instagramUserId}/media_publish`,
          target.accessToken,
          { creation_id: creationId },
        );
      } catch (error) {
        throw new InstagramPublishError(error, true);
      }
      const mediaId = containerId(published);
      let url: string | null = null;
      try {
        const details = await graph.get(`/${mediaId}`, target.accessToken, {
          fields: "permalink",
        });
        url = typeof details.permalink === "string" ? details.permalink : null;
      } catch {
        options.logger.warn(
          { stage: "permalink_lookup" },
          "Instagram permalink could not be read",
        );
      }
      return { externalId: mediaId, url };
    } finally {
      await media.cleanup();
    }
  };

  return { publish, status, verifyConnection, verifyTarget };
};

export type InstagramPublishingService = ReturnType<
  typeof createInstagramPublishingService
>;
