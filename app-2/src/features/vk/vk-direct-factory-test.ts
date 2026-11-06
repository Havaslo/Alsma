import { Router } from "express";
import { readFile } from "node:fs/promises";
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
import { extractVkAccessToken } from "./vk-access-token-input.js";
import { createVkPhotoAccessStore } from "./vk-photo-access-store.js";
import { photoAuthDiagnostic } from "./vk-photo-auth-diagnostic.js";
import { prepareVkPhoto } from "./vk-photo-image.js";
import { validateTestUploadUrl } from "./vk-test-photo-upload.js";
import {
  VkApiError,
  VkPhotoUploadEmptyError,
  VkPostVerificationError,
  createVkClient,
} from "./vk.client.js";

const groupId = "138003065";
const inputSchema = z
  .object({
    postId: z.string().uuid(),
    prepareOnly: z.boolean().optional(),
    diagnosticTransport: z.enum(["https"]).optional(),
    fixture: z.boolean().optional(),
    diagnosticUserWall: z.boolean().optional(),
    diagnosticMessages: z.boolean().optional(),
  })
  .strict();
const accessSchema = z
  .object({ url: z.string().trim().min(10).max(4096) })
  .strict();
const limit = 10 * 1024 * 1024;

export function createVkDirectFactoryTestRouter(
  database: Database,
  storage: ManagedStorage,
  logger: Logger,
  getConnectedPhotoToken?: () => Promise<string | undefined>,
  allowPublishing = true,
): Router {
  const router = Router();
  const inProgress = new Set<string>();
  const unknown = new Set<string>();
  const connection = createVkPhotoAccessStore();
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
  // The signed-in owner pastes the address VK redirected to; the token is kept
  // in memory only and is never logged or returned to the browser.
  router.post("/token", async (req, res) => {
    if (getConnectedPhotoToken) {
      res.status(409).json({ error: "USE_SERVER_PHOTO_CONNECTION" });
      return;
    }
    const input = accessSchema.safeParse(req.body);
    const token = input.success ? extractVkAccessToken(input.data.url) : null;
    if (!token) {
      res.status(400).json({ error: "INVALID_ACCESS_URL" });
      return;
    }
    const groupToken = process.env.VK_BLACK_TURTLE_TEST_TOKEN?.trim();
    if (!groupToken) {
      res.status(409).json({ error: "GROUP_TOKEN_MISSING" });
      return;
    }
    const client = createVkClient({
      accessToken: groupToken,
      photoUploadAccessToken: token,
      logger,
      singleAttempt: true,
      validatePhotoUploadUrl: (url) => Boolean(validateTestUploadUrl(url)),
    });
    try {
      await client.verifyWallPhotoUpload(groupId);
    } catch (error) {
      const code = error instanceof VkApiError ? error.code : null;
      const reason = photoAuthDiagnostic(error);
      logger.warn(
        { vkCode: code, reason },
        "VK photo upload access was rejected",
      );
      res.status(400).json({ error: "VK_ACCESS_DENIED", code, reason });
      return;
    }
    connection.set(res.locals.admin.id, token);
    res.json({ ok: true, expiresInMinutes: 60 });
  });
  router.post("/disconnect", (_req, res) => {
    connection.clear(res.locals.admin.id);
    res.json({ ok: true });
  });
  router.get("/status", async (_req, res) => {
    const groupToken = process.env.VK_BLACK_TURTLE_TEST_TOKEN?.trim();
    const photoToken = getConnectedPhotoToken
      ? await getConnectedPhotoToken().catch(() => undefined)
      : connection.get(res.locals.admin.id);
    if (!groupToken || !photoToken) {
      res.json({
        ready: false,
        reason: !groupToken ? "GROUP_TOKEN_MISSING" : "PHOTO_TOKEN_MISSING",
      });
      return;
    }
    let uploadDestination:
      { host: string; path: string; groupMatches: boolean } | undefined;
    const client = createVkClient({
      accessToken: groupToken,
      photoUploadAccessToken: photoToken,
      logger,
      singleAttempt: true,
      validatePhotoUploadUrl: (raw) => {
        const valid = Boolean(validateTestUploadUrl(raw));
        if (!valid) {
          try {
            const url = new URL(raw);
            uploadDestination = {
              host: url.hostname,
              path: url.pathname,
              groupMatches: url.searchParams.get("gid") === groupId,
            };
          } catch {}
        }
        return valid;
      },
    });
    try {
      await client.verifyCredentials(groupId);
      await client.verifyWallPhotoUpload(groupId);
      res.json({
        ready: true,
        communityAccess: await client.inspectPublishingAccess(groupId),
        network: {
          node: process.versions.node,
          proxyConfigured: Boolean(
            process.env.HTTPS_PROXY ||
            process.env.HTTP_PROXY ||
            process.env.ALL_PROXY,
          ),
          nodeUseEnvProxy: process.env.NODE_USE_ENV_PROXY === "1",
        },
        photoGroupRole: await client
          .inspectPhotoGroupRole(groupId)
          .catch(() => null),
      });
    } catch (error) {
      res.json({
        ready: false,
        reason: uploadDestination
          ? "UPLOAD_URL_REJECTED"
          : "ACCESS_NOT_VERIFIED",
        ...(uploadDestination ? { uploadDestination } : {}),
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
    if (
      (input.data.diagnosticTransport ||
        input.data.fixture ||
        input.data.diagnosticUserWall ||
        input.data.diagnosticMessages) &&
      !input.data.prepareOnly
    ) {
      res.status(400).json({ error: "PREPARATION_REQUIRED" });
      return;
    }
    if (!allowPublishing && !input.data.prepareOnly) {
      res.status(403).json({ error: "PREPARATION_ONLY" });
      return;
    }
    const postId = input.data.postId;
    if (inProgress.has(postId) || unknown.has(postId)) {
      res.status(409).json({ error: "CHECK_TEST_WALL" });
      return;
    }
    const groupToken = process.env.VK_BLACK_TURTLE_TEST_TOKEN?.trim();
    const photoToken = getConnectedPhotoToken
      ? await getConnectedPhotoToken().catch(() => undefined)
      : connection.get(res.locals.admin.id);
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
        diagnosticHttps: input.data.diagnosticTransport === "https",
        validatePhotoUploadUrl: (url) =>
          Boolean(
            validateTestUploadUrl(
              url,
              input.data.diagnosticUserWall,
              input.data.diagnosticMessages,
            ),
          ),
      });
      await client.verifyCredentials(groupId);
      if (!input.data.diagnosticUserWall && !input.data.diagnosticMessages)
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
      let bytes = new Uint8Array(await response.arrayBuffer());
      let contentType = media.contentType;
      let fileName = media.fileName;
      if (!bytes.length || bytes.length > limit) {
        res.status(400).json({ error: "INVALID_PHOTO" });
        return;
      }
      if (input.data.fixture) {
        bytes = new Uint8Array(
          await readFile(
            new URL(
              "../content-factory/assets/vk-test-photo.jpg",
              import.meta.url,
            ),
          ),
        );
        contentType = "image/jpeg";
        fileName = "test.jpg";
      }
      const preparedImage = await prepareVkPhoto({
        content: bytes,
        contentType,
        fileName,
      });
      providerStarted = true;
      const result = await client.publishWallPost({
        groupId,
        idempotencyKey: `test-${postId}`,
        prepareOnly: input.data.prepareOnly,
        diagnosticTransport: input.data.diagnosticTransport,
        diagnosticUserWall: input.data.diagnosticUserWall,
        diagnosticMessages: input.data.diagnosticMessages,
        text: post.generatedCopy,
        images: [preparedImage],
      });
      if (input.data.prepareOnly)
        res.json({ prepared: true, photos: result.preparedPhotos });
      else res.json({ url: result.url, postId: result.externalId });
    } catch (error) {
      if (error instanceof VkPostVerificationError) {
        unknown.add(postId);
        res.status(502).json({ error: "PHOTO_NOT_CONFIRMED", url: error.url });
      } else if (error instanceof VkPhotoUploadEmptyError) {
        res.status(502).json({
          error: "PHOTO_UPLOAD_EMPTY",
          method: error.method,
          uploadDiagnostic: error.uploadDiagnostic,
          uploadTransport: error.uploadTransport,
        });
      } else if (!providerStarted)
        res.status(502).json({
          error: "TEST_PREFLIGHT_FAILED",
          code: error instanceof VkApiError ? error.code : null,
        });
      else if (error instanceof VkApiError)
        // VK answered with an error, so nothing was published and a retry is safe.
        res.status(502).json({
          error: "TEST_POST_DENIED",
          code: error.code,
          method: error.method,
          invalidParameters: error.invalidParameters,
          uploadDiagnostic: error.uploadDiagnostic,
          uploadTransport: error.uploadTransport,
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
