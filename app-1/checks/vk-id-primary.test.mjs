import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function evaluate(file, imports) {
  const exports = {};
  const output = ts.transpileModule(
    fs.readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(output, {
    exports,
    require: (name) => {
      assert.ok(name in imports, `Unexpected dependency: ${name}`);
      return imports[name];
    },
    window: { location: { search: "", assign() {} } },
    URLSearchParams,
  });
  return exports;
}

test("primary connect and reconnect call VK ID endpoint without browser renewal", async () => {
  const requests = [];
  const api = evaluate("../src/lib/content-factory/vkPhotoConnectionApi.ts", {
    "@/lib/admin/admin-session": { readAdminSession: () => "test" },
    "@/lib/api/api-client": {
      apiClient: {
        post: async (path) => {
          requests.push(path);
          return { data: { authorizationUrl: "https://id.vk.ru/authorize" } };
        },
      },
    },
  });
  for (const photoReady of [false, true]) {
    const node = (type, props) => ({ type, props });
    const { VkPhotoConnectionCard } = evaluate(
      "../src/components/admin/content-factory/VkPhotoConnectionCard.tsx",
      {
        react: { useState: (value) => [value, () => {}] },
        "react/jsx-runtime": { jsx: node, jsxs: node },
        "@tanstack/react-query": {
          useQuery: () => ({
            data: {
              configured: true,
              photoReady,
              activeSource: "legacy",
              vkId: { configured: true },
            },
          }),
          useMutation: ({ mutationFn }) => ({
            mutate: mutationFn,
            isPending: false,
          }),
        },
        "@/components/ui/Button": { Button: "button" },
        "@/lib/content-factory/contentFactoryApi": {
          contentFactoryErrorMessage: () => "error",
        },
        "@/lib/content-factory/vkPhotoConnectionApi": api,
      },
    );
    const children = VkPhotoConnectionCard().props.children;
    const primary = children.find((child) => child?.type === "button");
    assert.equal(primary.props.disabled, false);
    await primary.props.onClick();
  }
  assert.deepEqual(requests, [
    "/vk-photo-connection/vkid/start",
    "/vk-photo-connection/vkid/start",
  ]);
});
