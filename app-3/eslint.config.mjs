import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "src/routeTree.gen.ts"],
  },
  {
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["src/pages/**/*.tsx", "src/routes/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          message:
            "Use the reusable Button component instead of a native button in pages and routes.",
          selector: "JSXOpeningElement[name.name='button']",
        },
        {
          message:
            "Use reusable form components instead of a native input in pages and routes.",
          selector: "JSXOpeningElement[name.name='input']",
        },
        {
          message:
            "Use the reusable Select component instead of a native select in pages and routes.",
          selector: "JSXOpeningElement[name.name='select']",
        },
        {
          message:
            "Use the reusable Textarea component instead of a native textarea in pages and routes.",
          selector: "JSXOpeningElement[name.name='textarea']",
        },
      ],
    },
  },
);
