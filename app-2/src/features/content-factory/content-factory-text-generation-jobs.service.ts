import type { Logger } from "pino";
import { z } from "zod";

import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ContentFactoryAiService } from "./content-factory-ai.service.js";
import { createContentFactoryRepository } from "./content-factory.repository.js";
import {
  type ContentFactoryTextGenerationBody,
  contentFactoryTextGenerationBodySchema,
} from "./content-factory.schemas.js";

const staleJobMilliseconds = 5 * 60 * 1_000;

const generationResultSchema = z.object({
  model: z.string().min(1),
  variants: z
    .array(
      z.object({
        title: z.string().min(1),
        concept: z.string().min(1),
        text: z.string().min(1),
        adaptations: z.object({
          vk: z.string(),
          telegram: z.string(),
          max: z.string(),
          instagram: z.string(),
          zen: z.string(),
          blog: z.string(),
        }),
      }),
    )
    .length(3),
});

const generationErrorMessage = (error: unknown) =>
  error instanceof HttpError
    ? error.message
    : "Не удалось создать текстовые варианты. Повторите запрос немного позже.";

export const createContentFactoryTextGenerationJobsService = (options: {
  readonly ai: Pick<ContentFactoryAiService, "generateText">;
  readonly database: Database;
  readonly logger: Logger;
}) => {
  const repository = createContentFactoryRepository(options.database);
  const activeJobs = new Set<string>();

  const processJob = async (jobId: string) => {
    try {
      const claim = await repository.claimTextGenerationJob(jobId);
      if (claim.count === 0) return;
      const job = await repository.findTextGenerationJob(jobId);
      if (!job) return;

      const parsedInput = contentFactoryTextGenerationBodySchema.safeParse(
        job.input,
      );
      if (!parsedInput.success) {
        throw new Error("Stored text generation input is invalid.");
      }

      const result = await options.ai.generateText(parsedInput.data);
      await repository.updateTextGenerationJob(jobId, {
        errorMessage: null,
        result: result as Prisma.InputJsonValue,
        status: "completed",
      });
    } catch (error) {
      options.logger.warn(
        {
          errorName: error instanceof Error ? error.name : "UnknownError",
          jobId,
        },
        "Content factory text generation job failed",
      );
      await repository
        .updateTextGenerationJob(jobId, {
          errorMessage: generationErrorMessage(error),
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
            "Content factory text generation failure could not be saved",
          );
        });
    }
  };

  const scheduleJob = (jobId: string) => {
    if (activeJobs.has(jobId)) return;
    activeJobs.add(jobId);
    void processJob(jobId).finally(() => activeJobs.delete(jobId));
  };

  const submit = async (
    adminId: string,
    input: ContentFactoryTextGenerationBody,
  ) => {
    const job = await repository.createTextGenerationJob({
      createdById: adminId,
      input: input as Prisma.InputJsonValue,
    });
    scheduleJob(job.id);
    return { jobId: job.id, status: "pending" as const };
  };

  const getStatus = async (jobId: string, adminId: string) => {
    let job = await repository.findTextGenerationJobForAdmin(jobId, adminId);
    if (!job) {
      throw new HttpError(
        404,
        "CONTENT_FACTORY_TEXT_JOB_NOT_FOUND",
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
      job = await repository.updateTextGenerationJob(jobId, {
        errorMessage:
          "Задача прервалась до получения результата. Запустите генерацию ещё раз.",
        status: "failed",
      });
    }

    if (job.status === "completed") {
      const result = generationResultSchema.safeParse(job.result);
      if (!result.success) {
        throw new HttpError(
          500,
          "CONTENT_FACTORY_TEXT_JOB_RESULT_INVALID",
          "Не удалось прочитать результат генерации. Повторите запрос.",
        );
      }
      return { result: result.data, status: "completed" as const };
    }

    if (job.status === "failed") {
      return {
        message: job.errorMessage ?? generationErrorMessage(null),
        status: "failed" as const,
      };
    }

    return { status: "processing" as const };
  };

  return { getStatus, submit };
};

export type ContentFactoryTextGenerationJobsService = ReturnType<
  typeof createContentFactoryTextGenerationJobsService
>;
