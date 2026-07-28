/** @type {import("prettier").Config} */
const config = {
  importOrder: ["^react", "^@?\\w", "^@/", "^[./]"],
  importOrderParserPlugins: ["typescript", "jsx"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: [
    "@trivago/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
  tailwindStylesheet: "./src/index.css",
};

export default config;
