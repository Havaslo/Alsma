const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function launch({
  referrer = "https://vk.ru/",
  appId = "54873380",
  top = false,
  dev = true,
  failInit = false,
  denial = false,
  noToken = false,
} = {}) {
  const calls = [];
  const button = {
    disabled: true,
    listener: null,
    addEventListener(_event, listener) {
      this.listener = listener;
    },
  };
  const status = { textContent: "" };
  const publishButton = {
    disabled: true,
    listener: null,
    addEventListener(_event, listener) {
      this.listener = listener;
    },
  };
  const publishStatus = { textContent: "" };
  const factoryButton = {
    disabled: true,
    listener: null,
    addEventListener(_event, listener) {
      this.listener = listener;
    },
  };
  const factoryCode = { value: "a".repeat(64) };
  const factoryStatus = { textContent: "" };
  const factoryCalls = [];
  const window = {};
  window.parent = top ? window : {};
  const bridge = {
    async send(method, params) {
      calls.push({ method, params });
      if (method === "VKWebAppInit" && failInit) throw new Error("init failed");
      if (method === "VKWebAppGetAuthToken") {
        return { access_token: noToken ? "" : "synthetic-secret" };
      }
      if (method === "VKWebAppCallAPIMethod") {
        if (denial)
          throw {
            error_data: {
              error: { error_code: 27, access_token: "synthetic-secret" },
            },
          };
        return { response: { upload_url: "https://vk.ru/example" } };
      }
      return { result: true };
    },
  };
  const source = fs
    .readFileSync(
      path.join(__dirname, "../src/devtools/vkPhotoProbe.ts"),
      "utf8",
    )
    .replace(
      'import bridge from "@vkontakte/vk-bridge";',
      "const bridge = globalThis.__bridge;",
    )
    .replace(
      'import { PhotoUploadError, publishTestPost } from "./vkTestPost";',
      "const publishTestPost = globalThis.__publishTestPost; class PhotoUploadError extends Error {}",
    )
    .replace(
      'import { publishFactoryTest } from "./vkFactoryTest";',
      "const publishFactoryTest = globalThis.__publishFactoryTest;",
    )
    .replace("import.meta.env.DEV", String(dev));
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
    },
  }).outputText;
  const context = vm.createContext({
    exports: {},
    __bridge: bridge,
    __publishTestPost: async () => 123,
    __publishFactoryTest: async (code) => {
      factoryCalls.push(code);
      return 123;
    },
    window,
    location: { search: `?vk_app_id=${appId}` },
    document: {
      referrer,
      querySelector: (selector) =>
        ({
          "#check": button,
          "#status": status,
          "#publish": publishButton,
          "#publish-status": publishStatus,
          "#factory-publish": factoryButton,
          "#factory-code": factoryCode,
          "#factory-status": factoryStatus,
        })[selector],
    },
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    Promise,
  });
  vm.runInContext(javascript, context);
  return {
    button,
    status,
    publishButton,
    publishStatus,
    factoryButton,
    factoryCode,
    factoryStatus,
    factoryCalls,
    calls,
  };
}

async function settle() {
  for (let i = 0; i < 5; i++)
    await new Promise((resolve) => setImmediate(resolve));
}

test("initializes VK at launch, before requesting access", async () => {
  const page = launch();
  assert.deepEqual(
    page.calls.map((call) => call.method),
    ["VKWebAppInit"],
  );
  assert.equal(page.button.disabled, true);
  await settle();
  assert.equal(page.button.disabled, false);
  assert.match(page.status.textContent, /Нажмите кнопку/);
  assert.equal(page.calls.length, 1);
});

test("requests photo access only on click and never posts", async () => {
  const page = launch();
  await settle();
  page.button.listener();
  await settle();
  assert.deepEqual(
    page.calls.map((call) => call.method),
    ["VKWebAppInit", "VKWebAppGetAuthToken", "VKWebAppCallAPIMethod"],
  );
  assert.equal(page.calls[1].params.app_id, 54873380);
  assert.equal(page.calls[1].params.scope, "photos");
  assert.equal(page.calls[2].params.method, "photos.getWallUploadServer");
  assert.equal(page.calls[2].params.params.group_id, 138003065);
  assert.match(page.status.textContent, /VK вернул адрес загрузки/);
  assert.doesNotMatch(page.status.textContent, /synthetic-secret/);
});

test("shows denied or missing access without revealing a token", async () => {
  for (const [options, expected] of [
    [{ denial: true }, /код VK: 27/],
    [{ noToken: true }, /не вернул ключ/],
  ]) {
    const page = launch(options);
    await settle();
    page.button.listener();
    await settle();
    assert.match(page.status.textContent, expected);
    assert.doesNotMatch(page.status.textContent, /synthetic-secret/);
  }
});

test("does not request credentials for unsafe launches", async () => {
  for (const options of [
    { top: true },
    { referrer: "https://evil.example/" },
    { appId: "54867260" },
    { referrer: "" },
    { dev: false },
  ]) {
    const page = launch(options);
    await settle();
    assert.equal(page.button.disabled, true);
    assert.equal(page.button.listener, null);
    assert.equal(page.publishButton.disabled, true);
    assert.equal(page.publishButton.listener, null);
    assert.equal(page.factoryButton.disabled, true);
    assert.equal(page.factoryButton.listener, null);
    assert.equal(
      page.calls.some((call) => call.method !== "VKWebAppInit"),
      false,
    );
  }
});

test("keeps access disabled when initialization fails", async () => {
  const page = launch({ failInit: true });
  await settle();
  assert.equal(page.button.disabled, true);
  assert.equal(page.button.listener, null);
  assert.match(page.status.textContent, /Не удалось.*VK/);
});
