const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs
  .readFileSync(
    path.join(__dirname, "../src/devtools/vkFactoryTest.ts"),
    "utf8",
  )
  .replace(
    'import { apiUrl } from "../lib/api/api-base-url";',
    "const apiUrl = (path: string) => path;",
  );
const js = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
function setup({ badOwner = false } = {}) {
  const calls = [];
  const stages = [];
  const requests = [];
  const bridge = {
    async send(method, params) {
      calls.push({ method, params });
      if (method === "VKWebAppGetAuthToken") return { access_token: "secret" };
      if (method === "VKWebAppGetUserInfo") return { id: 123 };
      if (params.method === "photos.getWallUploadServer")
        return { response: { upload_url: "https://pu.vk.ru/example" } };
      if (params.method === "photos.saveWallPhoto")
        return {
          response: [
            { owner_id: badOwner ? 999 : 123, id: 456, access_key: "abc" },
          ],
        };
      throw new Error("unexpected method");
    },
  };
  const fakeFetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    if (String(url).endsWith("/upload"))
      return Response.json({ server: 1, photo: "data", hash: "hash" });
    if (String(url).endsWith("/publish")) return Response.json({ postId: 987 });
    throw new Error("unexpected request");
  };
  const exports = {};
  const context = vm.createContext({
    exports,
    fetch: fakeFetch,
    URL,
    AbortSignal,
    setTimeout,
    clearTimeout,
    Promise,
  });
  vm.runInContext(js, context);
  return {
    run: () =>
      exports.publishFactoryTest("a".repeat(64), bridge, (value) =>
        stages.push(value),
      ),
    calls,
    stages,
    requests,
  };
}
test("factory photo uses VK user bridge and server-only group publication", async () => {
  const s = setup();
  assert.equal(await s.run(), 987);
  assert.deepEqual(
    s.calls.filter((c) => c.params?.method).map((c) => c.params.method),
    ["photos.getWallUploadServer", "photos.saveWallPhoto"],
  );
  assert.equal(s.calls[2].params.params.group_id, 138003065);
  assert.equal(s.requests.length, 2);
  assert.equal(s.requests[1].body.photo.ownerId, 123);
  assert.equal(s.requests[1].body.photo.id, 456);
  assert.equal(s.stages.at(-1), "публикация поста");
});
test("unexpected photo owner stops before group publication", async () => {
  const s = setup({ badOwner: true });
  await assert.rejects(s.run());
  assert.equal(s.requests.length, 1);
  assert.ok(!s.stages.includes("публикация поста"));
});
