import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import type { ContentFactoryAiService } from "./content-factory-ai.service.js";
import { assertReferencePhoto } from "./content-factory-image-processing.js";
import { createContentFactoryRepository } from "./content-factory.repository.js";
import type { ContentFactoryImageGenerationBody } from "./content-factory.schemas.js";

const staleJobMilliseconds = 5 * 60 * 1_000;

const contentChannelSchema = z.enum([
  "vk",
  "telegram",
  "max",
  "instagram",
  "zen",
]);

const generationResultSchema = z.object({
  assets: z.array(
    z.object({
      channels: z.array(contentChannelSchema),
      mediaId: z.uuid(),
      setIndex: z.number().int().min(0).max(3).default(0),
    }),
  ),
  model: z.string(),
});

const imageGenerationErrorMessage = (error: unknown) =>
  error instanceof HttpError
    ? error.message
    : "Не удалось завершить генерацию. Попробуйте ещё раз.";

export const createContentFactoryImageGenerationJobsService = (options: {
  readonly ai: Pick<ContentFactoryAiService, "generateImage">;
  readonly database: Database;
  readonly fetchImplementation?: typeof fetch;
  readonly logger: Logger;
  readonly managedStorage: ManagedStorage;
}) => {
  const repository = createContentFactoryRepository(options.database);
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const activeJobs = new Set<string>();

  const removeObject = async (objectId: string) => {
    if (!objectId) return;
    await options.managedStorage
      .deleteObject(objectId)
      .catch((error: unknown) => {
        options.logger.warn(
          { errorName: error instanceof Error ? error.name : "UnknownError" },
          "Temporary content factory generation photo cleanup failed",
        );
      });
  };

  const processJob = async (jobId: string) => {
    let sourceObjectId = "";
    let generatedAssets: Awaited<
      ReturnType<ContentFactoryAiService["generateImage"]>
    >["assets"] = [];
    let completed = false;
    try {
      const claim = await repository.claimImageGenerationJob(jobId);
      if (claim.count === 0) return;
      const job = await repository.findImageGenerationJob(jobId);
      if (!job) return;
      sourceObjectId = job.referencePhotoObjectId;

      const download = await options.managedStorage.getDownload(sourceObjectId);
      const sourceResponse = await fetchImplementation(download.downloadUrl);
      if (!sourceResponse.ok) {
        throw new Error("Temporary source photo could not be downloaded.");
      }
      const sourcePhoto = Buffer.from(await sourceResponse.arrayBuffer());
      assertReferencePhoto(sourcePhoto, "image/jpeg");
      const selectedChannels = z
        .array(contentChannelSchema)
        .min(1)
        .max(5)
        .parse(job.selectedChannels);
      const imageCount = z.number().int().min(1).max(4).parse(job.imageCount);

      const result = await options.ai.generateImage({
        adminId: job.createdById,
        imageCount,
        postText: job.postText,
        prompt: job.prompt,
        selectedChannels,
        sourceTitle: job.sourceTitle,
        sourceCategory: job.sourceCategory,
        sourceTags: job.sourceTags,
        referencePhoto: sourcePhoto,
        referencePhotoContentType: "image/jpeg",
      });
      generatedAssets = result.assets;
      const persistedResult = {
        assets: result.assets.map(({ channels, media, setIndex }) => ({
          channels,
          mediaId: media.id,
          setIndex,
        })),
        model: result.model,
      };
      await repository.updateImageGenerationJob(jobId, {
        errorMessage: null,
        referencePhotoObjectId: "",
        result: persistedResult,
        status: "completed",
      });
      completed = true;
    } catch (error) {
      options.logger.warn(
        {
          errorName: error instanceof Error ? error.name : "UnknownError",
          jobId,
        },
        "Content factory image generation job failed",
      );
      if (!completed && generatedAssets.length) {
        await Promise.all(
          generatedAssets.map(async ({ media }) => {
            await repository.deleteMedia(media.id).catch(() => undefined);
            await options.managedStorage
              .deleteObject(media.objectId)
              .catch(() => undefined);
          }),
        );
      }
      await repository
        .updateImageGenerationJob(jobId, {
          errorMessage: imageGenerationErrorMessage(error),
          referencePhotoObjectId: "",
          status: "failed",
        })
        .catch((updateError: unknown) => {
          options.logger.error(
            {
              errorName:
                updateError instanceof Error
                  ? updateError.name
                  : "UnknownError",
              jobId,
            },
            "Content factory image generation failure could not be saved",
          );
        });
    } finally {
      await removeObject(sourceObjectId);
    }
  };

  const scheduleJob = (jobId: string) => {
    if (activeJobs.has(jobId)) return;
    activeJobs.add(jobId);
    void processJob(jobId).finally(() => activeJobs.delete(jobId));
  };

  const submit = async (
    adminId: string,
    input: ContentFactoryImageGenerationBody,
  ) => {
    const referencePhoto = Buffer.from(input.referencePhotoBase64, "base64");
    assertReferencePhoto(referencePhoto, "image/jpeg");
    const upload = await options.managedStorage.upload({
      content: Uint8Array.from(referencePhoto),
      contentType: "image/jpeg",
      name: `content-factory-reference-${Date.now()}.jpg`,
    });
    try {
      const job = await repository.createImageGenerationJob({
        createdById: adminId,
        imageCount: input.imageCount,
        postText: input.postText,
        prompt: input.prompt,
        referencePhotoObjectId: upload.objectId,
        selectedChannels: input.selectedChannels,
        sourceCategory: input.sourceCategory,
        sourceTags: input.sourceTags,
        sourceTitle: input.sourceTitle,
      });
      scheduleJob(job.id);
      return { jobId: job.id, status: "pending" as const };
    } catch (error) {
      await removeObject(upload.objectId);
      throw error;
    }
  };

  const getStatus = async (jobId: string, adminId: string) => {
    let job = await repository.findImageGenerationJobForAdmin(jobId, adminId);
    if (!job) {
      throw new HttpError(
        404,
        "CONTENT_FACTORY_IMAGE_JOB_NOT_FOUND",
        "Задача генерации не найдена. Обновите страницу и попробуйте снова.",
      );
    }

    if (job.status === "pending") {
      scheduleJob(jobId);
      return { status: "pending" as const };
    }

    if (
      job.status === "processing" &&
      Date.now() - job.updatedAt.getTime() > staleJobMilliseconds
    ) {
      const sourceObjectId = job.referencePhotoObjectId;
      job = await repository.updateImageGenerationJob(jobId, {
        errorMessage:
          "Задача прервалась до получения результата. Запустите генерацию ещё раз.",
        referencePhotoObjectId: "",
        status: "failed",
      });
      await removeObject(sourceObjectId);
    }

    if (job.status === "completed") {
      const result = generationResultSchema.safeParse(job.result);
      if (!result.success) {
        throw new HttpError(
          500,
          "CONTENT_FACTORY_IMAGE_JOB_RESULT_INVALID",
          "Не удалось прочитать результат генерации. Проверьте медиатеку.",
        );
      }
      const mediaItems = await repository.findMediaByIds(
        result.data.assets.map((asset) => asset.mediaId),
      );
      const mediaById = new Map(mediaItems.map((media) => [media.id, media]));
      return {
        assets: result.data.assets.flatMap(
          ({ channels, mediaId, setIndex }) => {
            const media = mediaById.get(mediaId);
            return media ? [{ channels, media, setIndex }] : [];
          },
        ),
        model: result.data.model,
        status: "completed" as const,
      };
    }

    if (job.status === "failed") {
      return {
        message: job.errorMessage ?? "Не удалось завершить генерацию.",
        status: "failed" as const,
      };
    }

    return { status: "processing" as const };
  };

  return { getStatus, submit };
};

export type ContentFactoryImageGenerationJobsService = ReturnType<
  typeof createContentFactoryImageGenerationJobsService
>;
