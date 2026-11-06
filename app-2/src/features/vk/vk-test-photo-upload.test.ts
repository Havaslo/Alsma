import assert from "node:assert/strict";
import test from "node:test";

import {
  uploadTestPhoto,
  validateTestUploadUrl,
} from "./vk-test-photo-upload.js";

const valid =
  "https://pu.vk.ru/c123/ss456/upload.php?act=do_add&gid=138003065&hash=test&rhash=test";

test("accepts only the VK upload endpoint for the test group", () => {
  assert.ok(validateTestUploadUrl(valid));
  assert.ok(validateTestUploadUrl(valid.replace("pu.vk.ru", "pu.vk.com")));
  for (const url of [
    valid.replace("pu.vk.ru", "evil.example"),
    valid.replace("pu.vk.ru", "pu.vk.com.evil.example"),
    valid.replace("pu.vk.ru", "pu.vk.ru.evil.example"),
    valid.replace("https:", "http:"),
    valid.replace("138003065", "123"),
    valid + "&gid=123",
    valid.replace("/upload.php", "/other"),
    valid.replace("pu.vk.ru", "pu.vk.ru:8443"),
    valid.replace("pu.vk.ru", "user@pu.vk.ru"),
  ])
    assert.equal(validateTestUploadUrl(url), null);
});

test("sends only the bundled test photo and validates the response", async () => {
  const url = validateTestUploadUrl(valid)!;
  const fake = (async (target, options) => {
    assert.equal(String(target), valid);
    assert.equal(options?.redirect, "error");
    const photo = (options?.body as FormData).get("photo") as File;
    assert.equal(photo.name, "test.jpg");
    assert.ok(photo.size > 0);
    return new Response(
      JSON.stringify({
        server: 1,
        photo: "data",
        hash: "hash",
        extra: "discard",
      }),
    );
  }) as typeof fetch;
  assert.deepEqual(await uploadTestPhoto(url, fake), {
    server: 1,
    photo: "data",
    hash: "hash",
  });
  const invalid = (async () =>
    new Response(
      JSON.stringify({ server: 1, photo: "[]", hash: "x" }),
    )) as typeof fetch;
  await assert.rejects(uploadTestPhoto(url, invalid));
});

test("user-wall preparation remains restricted to the connected test user", () => {
  const base =
    "https://pu.vk.com/c1/ss2/upload.php?act=do_add&hash=h&rhash=r&mid=120486641";
  assert.ok(validateTestUploadUrl(base, true));
  assert.ok(validateTestUploadUrl(`${base}&gid=0`, true));
  assert.equal(validateTestUploadUrl(`${base}&gid=177090031`, true), null);
  assert.equal(
    validateTestUploadUrl(base.replace("120486641", "99"), true),
    null,
  );
  assert.equal(validateTestUploadUrl(base), null);
});
