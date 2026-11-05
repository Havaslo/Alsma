const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs
  .readFileSync(
    path.join(__dirname, "../src/devtools/vkPhotoConnection.ts"),
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
function make({ denied = false } = {}) {
  const calls = [];
  const exports = {};
  const bridge = {
    send: async (method, params) => {
      calls.push({ method, params });
      return { access_token: denied ? "" : "synthetic-token" };
    },
  };
  const fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ ok: true });
  };
  vm.runInContext(js, vm.createContext({ exports, fetch, AbortSignal }));
  return {
    calls,
    run: () => exports.connectVkPhotoTest("a".repeat(64), bridge),
  };
}
test("connect requests photos only and sends credential in POST body, not URL", async () => {
  const t = make();
  await t.run();
  assert.equal(t.calls[0].method, "VKWebAppGetAuthToken");
  assert.equal(t.calls[0].params.scope, "photos");
  assert.equal(t.calls[1].url, "/api/vk-factory-test/connect");
  assert.equal(t.calls[1].options.method, "POST");
  assert.equal(t.calls[1].options.credentials, "omit");
  assert.equal(t.calls[1].options.redirect, "error");
  assert.equal(JSON.parse(t.calls[1].options.body).token, "synthetic-token");
});
test("denied VK permission never sends credential", async () => {
  const t = make({ denied: true });
  await assert.rejects(t.run());
  assert.equal(t.calls.length, 1);
});
