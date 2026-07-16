/** @type {import("prettier").Config} */
const config = {
  importOrder: ["^@?\\w", "^[./]"],
  importOrderParserPlugins: ["typescript"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: ["@trivago/prettier-plugin-sort-imports"],
};

export default config;
