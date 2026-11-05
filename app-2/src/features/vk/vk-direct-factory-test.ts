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
import { createVkPhotoTestConnection } from "./vk-photo-test-connection.js";
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
  const connection = createVkPhotoTestConnection();
  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  // A one-use, high-entropy pairing code is created by a signed-in admin.
  // Neither code nor VK credential is accepted in URLs or returned to callers.
  router.post("/connect", async (req, res) => {
    const input = z
      .object({
        code: z.string().regex(/^[a-f0-9]{64}$/),
        token: z.string().trim().min(20).max(2048),
      })
      .strict()
      .safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: "INVALID_CONNECTION" });
      return;
    }
    const pair = connection.consume(input.data.code);
    if (!pair) {
      res.status(400).json({ error: "PAIR_EXPIRED" });
      return;
    }
    try {
      // Send credentials in the body, never query strings or logs.
      const payload = new URLSearchParams({
        group_id: groupId,
        access_token: input.data.token,
        v: "5.199",
      });
      const response = await fetch(
        "https://api.vk.com/method/photos.getWallUploadServer",
        {
          method: "POST",
          body: payload,
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        },
      );
      const result = (await response.json()) as {
        response?: { upload_url?: unknown };
        error?: { error_code?: number; error_msg?: unknown };
      };
      if (
        !response.ok ||
        typeof result.response?.upload_url !== "string" ||
        !validateTestUploadUrl(result.response.upload_url)
      ) {
        const code =
          typeof result.error?.error_code === "number"
            ? result.error.error_code
            : null;
        const detail =
          typeof result.error?.error_msg === "string"
            ? result.error.error_msg.slice(0, 200)
            : null;
        // The message never contains the token; it explains which VK rule failed.
        logger.warn(
          { vkCode: code, vkMessage: detail },
          "VK photo upload access was rejected",
        );
        res.status(400).json({ error: "VK_ACCESS_DENIED", code });
        return;
      }
      if (!connection.set(pair, input.data.token)) {
        res.status(400).json({ error: "PAIR_EXPIRED" });
        return;
      }
      res.json({ ok: true, expiresInMinutes: 15 });
    } catch {
      res.status(502).json({ error: "VK_ACCESS_UNAVAILABLE" });
    }
  });
  router.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
    createRequireAdminPermission("site.access", "site.manage"),
  );
  router.post("/pair", (_req, res) => {
    const code = connection.start(res.locals.admin.id);
    if (!code) {
      res.status(429).json({ error: "PAIR_LIMIT" });
      return;
    }
    res.status(201).json({ code, expiresInMinutes: 5 });
  });
  router.post("/disconnect", (_req, res) => {
    connection.clear(res.locals.admin.id);
    res.json({ ok: true });
  });
  router.get("/status", async (_req, res) => {
    const groupToken = process.env.VK_BLACK_TURTLE_TEST_TOKEN?.trim();
    const photoToken = connection.get(res.locals.admin.id);
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
    const photoToken = connection.get(res.locals.admin.id);
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
        typeof post.generatedCopy !== "string" ||
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
      if (!providerStarted)
        res.status(502).json({
          error: "TEST_PREFLIGHT_FAILED",
          code: error instanceof VkApiError ? error.code : null,
        });
      else if (error instanceof VkApiError)
        // VK answered with an error, so nothing was published and a retry is safe.
        res.status(502).json({
          error: "TEST_POST_DENIED",
          code: error.code,
        });
      else {
        unknown.add(postId);
        res.status(502).json({ error: "PUBLICATION_UNKNOWN" });
      }
    } finally {
      inProgress.delete(postId);
    }
  });
  return router;
}
