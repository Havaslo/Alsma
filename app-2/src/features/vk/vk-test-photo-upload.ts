import { Router } from "express";
import { readFile } from "node:fs/promises";
import { z } from "zod";

const testGroupId = "138003065";
const asset = new URL(
  "../content-factory/assets/vk-test-photo.jpg",
  import.meta.url,
);
const bodySchema = z.object({ uploadUrl: z.string().max(2048) }).strict();

// The VK upload URL is itself a short-lived bearer capability. Never log it.
export const validateTestUploadUrl = (
  raw: string,
  userWall = false,
  messages = false,
): URL | null => {
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      !["pu.vk.ru", "pu.vk.com"].includes(url.hostname) ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      !/^\/c\d+\/ss\d+\/upload\.php$/.test(url.pathname) ||
      (!messages &&
        (userWall
          ? (url.searchParams.get("gid") !== "0" &&
              url.searchParams.has("gid")) ||
            url.searchParams.get("mid") !== "120486641"
          : url.searchParams.getAll("gid").length !== 1 ||
            url.searchParams.get("gid") !== testGroupId)) ||
      url.searchParams.getAll("act").length !== 1 ||
      url.searchParams.get("act") !== "do_add" ||
      !url.searchParams.get("hash") ||
      !url.searchParams.get("rhash")
    )
      return null;
    return url;
  } catch {
    return null;
  }
};

export const uploadTestPhoto = async (url: URL, send = fetch) => {
  const image = await readFile(asset);
  const form = new FormData();
  form.append("photo", new Blob([image], { type: "image/jpeg" }), "test.jpg");
  const result = await send(url, {
    method: "POST",
    body: form,
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!result.ok) throw new Error("VK upload failed");
  const text = await result.text();
  if (text.length > 100_000) throw new Error("VK response too large");
  const response = z
    .object({
      server: z.union([z.number(), z.string()]),
      photo: z.string().min(1).max(90_000),
      hash: z.string().min(1).max(1024),
    })
    .safeParse(JSON.parse(text));
  if (!response.success || response.data.photo === "[]")
    throw new Error("VK response invalid");
  return response.data;
};

// Mounted in development only. A valid VK-issued URL is required; callers cannot
// choose a destination host, group, file, or cause a publication.
export const createVkTestPhotoUploadRouter = (): Router => {
  const router = Router();
  let busy = false;
  let attempts: number[] = [];
  router.post("/", async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const input = bodySchema.safeParse(request.body);
    const url = input.success
      ? validateTestUploadUrl(input.data.uploadUrl)
      : null;
    if (!url) {
      response.status(400).json({ error: "INVALID_UPLOAD_URL" });
      return;
    }
    const now = Date.now();
    attempts = attempts.filter((time) => now - time < 60_000);
    if (busy || attempts.length >= 10) {
      response.status(429).json({ error: "TEST_LIMIT" });
      return;
    }
    attempts.push(now);
    busy = true;
    try {
      response.json(await uploadTestPhoto(url));
    } catch {
      response.status(502).json({ error: "VK_UPLOAD_FAILED" });
    } finally {
      busy = false;
    }
  });
  return router;
};
