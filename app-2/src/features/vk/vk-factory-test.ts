import { Router } from "express";
import { randomBytes } from "node:crypto";
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

const groupId = "138003065";
const maxImage = 10 * 1024 * 1024;
const validCode = z.string().regex(/^[a-f0-9]{64}$/);
const createSchema = z.object({ postId: z.string().uuid() }).strict();
const uploadSchema = z
  .object({ code: validCode, uploadUrl: z.string().max(2048) })
  .strict();
const publishSchema = z
  .object({
    code: validCode,
    photo: z
      .object({
        ownerId: z.number().int().safe(),
        id: z.number().int().positive().safe(),
        accessKey: z
          .string()
          .regex(/^[a-zA-Z0-9]+$/)
          .max(128)
          .optional(),
      })
      .strict(),
    userId: z.number().int().positive().safe(),
  })
  .strict();

type Session = {
  text: string;
  content: Uint8Array;
  contentType: string;
  expires: number;
  state: "ready" | "uploading" | "uploaded" | "publishing";
};
export function createVkFactoryTestRouter(
  database: Database,
  storage: ManagedStorage,
): Router {
  const router = Router();
  const sessions = new Map<string, Session>();
  const clearExpired = () => {
    for (const [key, session] of sessions)
      if (session.expires <= Date.now()) sessions.delete(key);
  };
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.post(
    "/prepare",
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
    createRequireAdminPermission("site.access", "site.manage"),
    async (req, res) => {
      const input = createSchema.safeParse(req.body);
      if (!input.success) {
        res.status(400).json({ error: "INVALID_INPUT" });
        return;
      }
      if (!process.env.VK_BLACK_TURTLE_TEST_TOKEN?.trim()) {
        res.status(503).json({ error: "TEST_TOKEN_MISSING" });
        return;
      }
      clearExpired();
      if (sessions.size >= 10) {
        res.status(429).json({ error: "TEST_LIMIT" });
        return;
      }
      const post = await database.client.contentPlanPost.findUnique({
        where: { id: input.data.postId },
      });
      if (
        !post ||
        post.channel !== "vk" ||
        !["needs_review", "approved", "publish_failed"].includes(post.status) ||
        !post.generatedCopy.trim() ||
        post.imageIds.length !== 1
      ) {
        res.status(400).json({ error: "TEST_REQUIRES_VK_POST_WITH_ONE_IMAGE" });
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
        media.sizeBytes > maxImage
      ) {
        res.status(400).json({ error: "TEST_IMAGE_INVALID" });
        return;
      }
      const download = await storage.getDownload(media.objectId);
      if (download.sizeBytes > maxImage) {
        res.status(400).json({ error: "TEST_IMAGE_INVALID" });
        return;
      }
      const imageResponse = await fetch(download.downloadUrl, {
        signal: AbortSignal.timeout(30000),
      });
      if (!imageResponse.ok) {
        res.status(502).json({ error: "TEST_IMAGE_UNAVAILABLE" });
        return;
      }
      const content = new Uint8Array(await imageResponse.arrayBuffer());
      if (!content.length || content.length > maxImage) {
        res.status(400).json({ error: "TEST_IMAGE_INVALID" });
        return;
      }
      clearExpired();
      if (sessions.size >= 10) {
        res.status(429).json({ error: "TEST_LIMIT" });
        return;
      }
      const code = randomBytes(32).toString("hex");
      sessions.set(code, {
        text: post.generatedCopy,
        content,
        contentType: media.contentType,
        expires: Date.now() + 15 * 60_000,
        state: "ready",
      });
      setTimeout(() => sessions.delete(code), 15 * 60_000).unref();
      res.status(201).json({ code, expiresInMinutes: 15 });
    },
  );
  router.post("/upload", async (req, res) => {
    const input = uploadSchema.safeParse(req.body);
    clearExpired();
    const session = input.success ? sessions.get(input.data.code) : undefined;
    const url = input.success
      ? validateTestUploadUrl(input.data.uploadUrl)
      : null;
    if (!session || !url || session.state !== "ready") {
      res.status(400).json({ error: "TEST_SESSION_INVALID" });
      return;
    }
    session.state = "uploading";
    try {
      const form = new FormData();
      form.append(
        "photo",
        new Blob([new Uint8Array(session.content)], {
          type: session.contentType,
        }),
        session.contentType === "image/png"
          ? "photo.png"
          : session.contentType === "image/webp"
            ? "photo.webp"
            : "photo.jpg",
      );
      const uploaded = await fetch(url, {
        method: "POST",
        body: form,
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      });
      if (!uploaded.ok) throw new Error("upload failed");
      const text = await uploaded.text();
      if (text.length > 100_000) throw new Error("invalid response");
      const data = z
        .object({
          server: z.union([z.number(), z.string()]),
          photo: z
            .string()
            .min(1)
            .max(90_000)
            .refine((v) => v !== "[]"),
          hash: z.string().min(1).max(1024),
        })
        .parse(JSON.parse(text));
      session.state = "uploaded";
      res.json(data);
    } catch {
      session.state = "ready";
      res.status(502).json({ error: "VK_UPLOAD_FAILED" });
    }
  });
  router.post("/publish", async (req, res) => {
    const input = publishSchema.safeParse(req.body);
    clearExpired();
    const session = input.success ? sessions.get(input.data.code) : undefined;
    if (
      !input.success ||
      !session ||
      session.state !== "uploaded" ||
      ![-Number(groupId), input.data.userId].includes(input.data.photo.ownerId)
    ) {
      res.status(400).json({ error: "TEST_SESSION_INVALID" });
      return;
    }
    session.state = "publishing";
    const { photo } = input.data;
    const token = process.env.VK_BLACK_TURTLE_TEST_TOKEN?.trim();
    if (!token) {
      sessions.delete(input.data.code);
      res.status(503).json({ error: "TEST_TOKEN_MISSING" });
      return;
    }
    const body = new URLSearchParams({
      owner_id: `-${groupId}`,
      from_group: "1",
      message: session.text,
      attachments: `photo${photo.ownerId}_${photo.id}${photo.accessKey ? `_${photo.accessKey}` : ""}`,
      access_token: token,
      v: "5.199",
    });
    try {
      const reply = await fetch("https://api.vk.com/method/wall.post", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(20000),
      });
      const data = (await reply.json()) as {
        response?: { post_id?: number };
        error?: { error_code?: number };
      };
      if (
        Number.isSafeInteger(data.response?.post_id) &&
        (data.response?.post_id ?? 0) > 0
      )
        res.json({ postId: data.response!.post_id });
      else if (data.error)
        res
          .status(502)
          .json({ error: "VK_REJECTED", code: data.error.error_code });
      else res.status(502).json({ error: "PUBLICATION_UNKNOWN" });
    } catch {
      res.status(502).json({ error: "PUBLICATION_UNKNOWN" });
    } finally {
      sessions.delete(input.data.code);
    }
  });
  return router;
}
