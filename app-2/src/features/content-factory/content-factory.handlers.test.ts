import type { Request, Response } from "express";
import assert from "node:assert/strict";
import { test } from "node:test";

import type { Database } from "../../lib/database/database.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import {
  createSaveContentFactoryDraftHandler,
  createUploadContentFactoryMediaHandler,
} from "./content-factory.handlers.js";

const createResponse = (input: unknown) => {
  const state: { body?: unknown; statusCode: number } = { statusCode: 200 };
  const response = {
    json(body: unknown) {
      state.body = body;
      return this;
    },
    locals: { admin: { id: "00000000-0000-4000-8000-000000000001" }, input },
    status(statusCode: number) {
      state.statusCode = statusCode;
      return this;
    },
  } as unknown as Response;
  return { response, state };
};

test("creates a saved draft for the signed-in administrator", async () => {
  const database = {
    client: {
      contentFactoryDraft: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: "00000000-0000-4000-8000-000000000002",
        }),
      },
    },
  } as unknown as Database;
  const body = {
    title: "Пост о выходных",
    snapshot: { prompt: "Идея для публикации" },
  };
  const { response, state } = createResponse({ body, params: {} });

  await createSaveContentFactoryDraftHandler(database, false)(
    {} as Request,
    response,
    () => undefined,
  );

  assert.equal(state.statusCode, 201);
  assert.deepEqual(state.body, {
    draft: {
      ...body,
      createdById: "00000000-0000-4000-8000-000000000001",
      id: "00000000-0000-4000-8000-000000000002",
    },
  });
});

test("stores an uploaded image and returns a media-library URL", async () => {
  let uploadedName = "";
  const database = {
    client: {
      contentFactoryMedia: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          createdAt: new Date("2026-10-02T10:00:00.000Z"),
          id: "00000000-0000-4000-8000-000000000003",
        }),
      },
    },
  } as unknown as Database;
  const managedStorage = {
    deleteObject: async () => undefined,
    getDownload: async () => ({
      contentType: "image/png",
      downloadUrl: "https://storage.example/image.png",
      expiresAt: "2026-10-02T11:00:00.000Z",
      sizeBytes: 4,
    }),
    upload: async ({ name }: { name: string }) => {
      uploadedName = name;
      return { objectId: "managed-image-id" };
    },
  } as unknown as ManagedStorage;
  const request = {
    body: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    headers: { "content-type": "image/png" },
  } as unknown as Request;
  const { response, state } = createResponse({
    params: {},
    query: { fileName: "фото.png" },
  });

  await createUploadContentFactoryMediaHandler(database, managedStorage)(
    request,
    response,
    () => undefined,
  );

  assert.equal(state.statusCode, 201);
  assert.equal(uploadedName, "____.png");
  assert.deepEqual(state.body, {
    asset: {
      category: "Загрузки",
      contentType: "image/png",
      createdAt: new Date("2026-10-02T10:00:00.000Z"),
      fileName: "фото.png",
      id: "00000000-0000-4000-8000-000000000003",
      image: `/api/media/managed/${Buffer.from("managed-image-id").toString("base64url")}?contentType=image%2Fpng`,
      sizeBytes: 4,
      subtitle: "1 КБ",
      title: "фото.png",
      tags: [],
    },
  });
});
