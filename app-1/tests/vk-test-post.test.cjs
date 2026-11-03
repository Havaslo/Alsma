const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/devtools/vkTestPost.ts"),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

function scenario({
  failUpload = false,
  wrongPhotoOwner = false,
  failPost = false,
  badHost = false,
  imageStatus = 200,
  uploadStatus = 200,
} = {}) {
  const bridgeCalls = [];
  const fetchCalls = [];
  const stages = [];
  const bridge = {
    async send(method, params) {
      bridgeCalls.push({ method, params });
      if (method === "VKWebAppGetAuthToken")
        return { access_token: "synthetic-secret" };
      if (params.method === "photos.getWallUploadServer")
        return {
          response: {
            upload_url: badHost
              ? "https://evil.example/upload"
              : "https://pu.vk.com/upload",
          },
        };
      if (params.method === "photos.saveWallPhoto")
        return {
          response: [{ owner_id: wrongPhotoOwner ? -999 : -138003065, id: 77 }],
        };
      if (params.method === "wall.post") {
        if (failPost) throw { error_data: { error: { error_code: 15 } } };
        return { response: { post_id: 123 } };
      }
      throw new Error("Unexpected method");
    },
  };
  const fakeFetch = async (url, options) => {
    fetchCalls.push({ url: String(url), options });
    if (String(url).startsWith("/src/assets/"))
      return new Response(new Blob(["test"], { type: "image/jpeg" }), {
        status: imageStatus,
      });
    if (failUpload) throw new Error("network failure");
    return new Response(
      JSON.stringify({ server: 1, photo: '[{"id":1}]', hash: "hash" }),
      { status: uploadStatus },
    );
  };
  const exports = {};
  const context = vm.createContext({
    exports,
    fetch: fakeFetch,
    URL,
    FormData,
    Blob,
    AbortSignal,
    setTimeout,
    clearTimeout,
    Promise,
  });
  vm.runInContext(javascript, context);
  const run = () =>
    exports.publishTestPost({
      appId: 54873380,
      groupId: 138003065,
      bridge,
      onStage: (stage) => stages.push(stage),
    });
  return { run, stages, bridgeCalls, fetchCalls };
}

test("uploads a photo and posts only to the approved group", async () => {
  const s = scenario();
  assert.equal(await s.run(), 123);
  assert.equal(s.bridgeCalls[0].params.scope, "photos,wall");
  assert.deepEqual(
    s.bridgeCalls.slice(1).map((call) => call.params.method),
    ["photos.getWallUploadServer", "photos.saveWallPhoto", "wall.post"],
  );
  assert.equal(s.bridgeCalls[1].params.params.group_id, 138003065);
  assert.equal(s.bridgeCalls[2].params.params.group_id, 138003065);
  assert.equal(s.bridgeCalls[3].params.params.owner_id, -138003065);
  assert.equal(
    s.bridgeCalls[3].params.params.attachments,
    "photo-138003065_77",
  );
  assert.equal(s.fetchCalls.length, 2);
  assert.equal(s.fetchCalls[1].options.body.get("photo").name, "test.jpg");
});

test("reports a safe, distinct diagnostic for image and upload failures", async () => {
  for (const [options, expected] of [
    [{ imageStatus: 404 }, /Изображение недоступно \(HTTP 404\)/],
    [{ failUpload: true }, /Браузер не получил ответ сервера загрузки VK/],
    [{ uploadStatus: 403 }, /Сервер загрузки VK вернул HTTP 403/],
  ]) {
    const s = scenario(options);
    await assert.rejects(s.run(), (error) => {
      assert.match(error.message, expected);
      assert.doesNotMatch(error.message, /synthetic-secret/);
      return true;
    });
    assert.equal(
      s.bridgeCalls.some((call) => call.params?.method === "wall.post"),
      false,
    );
  }
});

test("stops before posting if the upload fails or the host is unexpected", async () => {
  for (const options of [
    { failUpload: true },
    { badHost: true },
    { wrongPhotoOwner: true },
  ]) {
    const s = scenario(options);
    await assert.rejects(s.run());
    assert.equal(
      s.bridgeCalls.some((call) => call.params?.method === "wall.post"),
      false,
    );
  }
});

test("makes at most one publication request on error", async () => {
  const s = scenario({ failPost: true });
  await assert.rejects(s.run());
  assert.equal(
    s.bridgeCalls.filter((call) => call.params?.method === "wall.post").length,
    1,
  );
  assert.equal(s.stages.at(-1), "публикация поста");
});
