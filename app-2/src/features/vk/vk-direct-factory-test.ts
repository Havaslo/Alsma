import { Router } from "express";
import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import { validateTestUploadUrl } from "./vk-test-photo-upload.js";
import { VkApiError, createVkClient } from "./vk.client.js";

const groupId = "138003065";
const inputSchema = z.object({ postId: z.string().uuid() }).strict();
const limit = 10 * 1024 * 1024;

export function createVkDirectFactoryTestRouter(
  database: Database,
  storage: ManagedStorage,
  logger: Logger,
): Router {
  const router = Router();
  const inProgress = new Set<string>();
  const unknown = new Set<string>();
  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  router.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
    createRequireAdminPermission("site.access", "site.manage"),
  );
  router.get("/status", async (_req, res) => {
    const groupToken = process.env.VK_BLACK_TURTLE_TEST_TOKEN?.trim();
    const photoToken = process.env.VK_BLACK_TURTLE_TEST_PHOTO_TOKEN?.trim();
    if (!groupToken || !photoToken) {
      res.json({
        ready: false,
        reason: !groupToken ? "GROUP_TOKEN_MISSING" : "PHOTO_TOKEN_MISSING",
      });
      return;
    }
    const client = createVkClient({
      accessToken: groupToken,
      photoUploadAccessToken: photoToken,
      logger,
      singleAttempt: true,
      validatePhotoUploadUrl: (url) => Boolean(validateTestUploadUrl(url)),
    });
    try {
      await client.verifyCredentials(groupId);
      await client.verifyWallPhotoUpload(groupId);
      res.json({ ready: true });
    } catch (error) {
      res.json({
        ready: false,
        reason: "ACCESS_NOT_VERIFIED",
        code: error instanceof VkApiError ? error.code : null,
      });
    }
  });
  router.post("/publish", async (req, res) => {
    const input = inputSchema.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: "INVALID_INPUT" });
      return;
    }
    const postId = input.data.postId;
    if (inProgress.has(postId) || unknown.has(postId)) {
      res.status(409).json({ error: "CHECK_TEST_WALL" });
      return;
    }
    const groupToken = process.env.VK_BLACK_TURTLE_TEST_TOKEN?.trim();
    const photoToken = process.env.VK_BLACK_TURTLE_TEST_PHOTO_TOKEN?.trim();
    if (!groupToken || !photoToken) {
      res.status(409).json({ error: "TEST_ACCESS_MISSING" });
      return;
    }
    inProgress.add(postId);
    let providerStarted = false;
    try {
      const post = await database.client.contentPlanPost.findUnique({
        where: { id: postId },
      });
      if (
        !post ||
        post.channel !== "vk" ||
        !["needs_review", "approved", "publish_failed"].includes(post.status) ||
        !post.generatedCopy.trim() ||
        post.imageIds.length !== 1
      ) {
        res.status(400).json({ error: "INVALID_POST" });
        return;
      }
      const media = await database.client.contentFactoryMedia.findUnique({
        where: { id: post.imageIds[0] },
      });
      if (
        !media ||
        !["image/jpeg", "image/png", "image/webp"].includes(
          media.contentType,
        ) ||
        media.sizeBytes > limit
      ) {
        res.status(400).json({ error: "INVALID_PHOTO" });
        return;
      }
      const client = createVkClient({
        accessToken: groupToken,
        photoUploadAccessToken: photoToken,
        logger,
        singleAttempt: true,
        validatePhotoUploadUrl: (url) => Boolean(validateTestUploadUrl(url)),
      });
      await client.verifyCredentials(groupId);
      await client.verifyWallPhotoUpload(groupId);
      const download = await storage.getDownload(media.objectId);
      if (download.sizeBytes > limit) {
        res.status(400).json({ error: "INVALID_PHOTO" });
        return;
      }
      const response = await fetch(download.downloadUrl, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error("IMAGE_UNAVAILABLE");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > limit) {
        res.status(400).json({ error: "INVALID_PHOTO" });
        return;
      }
      providerStarted = true;
      const result = await client.publishWallPost({
        groupId,
        idempotencyKey: `test-${postId}`,
        text: post.generatedCopy,
        images: [
          {
            content: bytes,
            contentType: media.contentType,
            fileName: media.fileName,
          },
        ],
      });
      res.json({ url: result.url, postId: result.externalId });
    } catch (error) {
      if (providerStarted) {
        unknown.add(postId);
        res.status(502).json({ error: "PUBLICATION_UNKNOWN" });
      } else
        res.status(502).json({
          error: "TEST_PREFLIGHT_FAILED",
          code: error instanceof VkApiError ? error.code : null,
        });
    } finally {
      inProgress.delete(postId);
    }
  });
  return router;
}
