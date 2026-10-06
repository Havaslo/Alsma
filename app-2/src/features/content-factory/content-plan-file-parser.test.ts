import assert from "node:assert/strict";
import test from "node:test";
import { utils, write } from "xlsx";

import { HttpError } from "../../lib/http/http-error.js";
import { parseContentPlanFile } from "./content-plan-file-parser.js";

const makeWorkbook = (rows: unknown[][]) => {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), "Контент-план");
  return write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
};

const headers = [
  "Дата публикации",
  "Тип публикации",
  "Площадка",
  "Формат",
  "Тема / заголовок",
  "Для кого пост",
  "Что рассказать (условия, ключевые факты)",
  "Призыв к действию / ссылка",
  "Стиль и ограничения",
  "Промт для изображения",
  "Исходное изображение (файл или рекомендация)",
];

test("parses the content-plan template and defaults omitted time to noon", () => {
  const content = makeWorkbook([
    ["Контент-план"],
    ["One row per channel"],
    headers,
    [
      "12.10.2026",
      "Акция",
      "VK",
      "Пост",
      "Осенние выходные",
      "Гости с гибкими датами",
      "Условия требуют подтверждения",
      "Уточнить детали",
      "Не обещать неподтверждённое",
      "Уютный осенний визуал",
      "Реальное фото территории",
    ],
  ]);

  const [post] = parseContentPlanFile(content, "plan.xlsx");
  assert.equal(post?.date, "2026-10-12");
  assert.equal(post?.time, "12:00");
  assert.equal(post?.channel, "vk");
  assert.equal(post?.sourceRow, 4);
  assert.equal(post?.topic, "Осенние выходные");
});

test("rejects unsupported channels before persisting a plan", () => {
  const content = makeWorkbook([
    headers,
    ["12.10.2026", "Новость", "YouTube", "Видео", "Тема"],
  ]);

  assert.throws(
    () => parseContentPlanFile(content, "plan.xlsx"),
    (error: unknown) =>
      error instanceof HttpError &&
      error.code === "CONTENT_PLAN_ROW_INVALID" &&
      error.message.includes("YouTube"),
  );
});

test("rejects workbooks that do not include the required columns", () => {
  const content = makeWorkbook([
    ["Дата", "Тема"],
    ["12.10.2026", "Пост"],
  ]);

  assert.throws(
    () => parseContentPlanFile(content, "plan.xlsx"),
    (error: unknown) =>
      error instanceof HttpError &&
      error.code === "CONTENT_PLAN_HEADERS_INVALID",
  );
});
