import express from "express";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import test from "node:test";

import { createVkPhotoConnectionRouter } from "./vk-photo-connection.routes.js";

test("photo connection requires admin permission; callback carries only a safe outcome", async () => {
  const database = {
    client: {
      adminSession: {
        findFirst: async ({ where }: { where: { tokenHash: string } }) =>
          where.tokenHash ===
          createHash("sha256").update("admin-session").digest("hex")
            ? {
                user: {
                  id: "admin",
                  displayName: "Admin",
                  email: "admin@example.com",
                  permissionOverrides: {},
                  role: { name: "admin", permissions: ["site.manage"] },
                },
              }
            : null,
      },
    },
  };
  let startCalls = 0;
  const app = express();
  app.use(express.json());
  app.use(
    createVkPhotoConnectionRouter(
      database as never,
      {
        status: async () => ({
          configured: true,
          photoReady: false,
          reason: "PHOTO_TOKEN_MISSING",
        }),
        start: async (origin: string | undefined) => {
          assert.equal(origin, "https://alsma.ru");
          startCalls++;
          return {
            authorizationUrl:
              "https://oauth.vk.com/authorize?response_type=code",
          };
        },
        complete: async (input: { code?: string }) => {
          assert.equal(input.code, "private-code");
          return { origin: "https://alsma.ru", result: "CONNECTED" };
        },
        startManual: async (origin: string, adminId: string) => {
          assert.equal(origin, "https://alsma.ru");
          assert.equal(adminId, "admin");
          return {
            authorizationUrl:
              "https://oauth.vk.com/authorize?response_type=code",
          };
        },
        completeManual: async (
          url: string,
          origin: string,
          adminId: string,
        ) => {
          assert.equal(
            url,
            "https://oauth.vk.com/blank.html?code=private&state=state",
          );
          assert.equal(origin, "https://alsma.ru");
          assert.equal(adminId, "admin");
          return { result: "CONNECTED" };
        },
        getToken: async () => undefined,
      } as never,
    ),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(base + "/status")).status, 401);
    assert.equal(
      (
        await fetch(base + "/connect/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      401,
    );
    assert.equal(startCalls, 0);
    const response = await fetch(base + "/connect/start", {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-session",
        Origin: "https://alsma.ru",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(response.status, 200);
    assert.equal(startCalls, 1);
    for (const path of ["/connect/manual/start", "/connect/manual/complete"]) {
      assert.equal(
        (
          await fetch(base + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          })
        ).status,
        401,
      );
    }
    const manual = await fetch(base + "/connect/manual/complete", {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-session",
        Origin: "https://alsma.ru",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callbackUrl: "https://oauth.vk.com/blank.html?code=private&state=state",
      }),
    });
    assert.equal(manual.status, 200);
    assert.deepEqual(await manual.json(), { result: "CONNECTED" });
    assert.equal(manual.headers.get("cache-control"), "no-store");
    const callback = await fetch(
      base + "/callback?state=state&code=private-code",
      { redirect: "manual" },
    );
    assert.equal(callback.status, 303);
    assert.equal(
      callback.headers.get("location"),
      "https://alsma.ru/admin/content-factory?vkPhotoConnection=CONNECTED",
    );
    assert.equal(callback.headers.get("cache-control"), "no-store");
    assert.equal(callback.headers.get("referrer-policy"), "no-referrer");
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
