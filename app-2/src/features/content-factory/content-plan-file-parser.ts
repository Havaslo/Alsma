import { SSF, read, utils } from "xlsx";

import { HttpError } from "../../lib/http/http-error.js";
import {
  type ContentPlanPostInput,
  contentPlanPostInputSchema,
} from "./content-plan.schemas.js";

const maxPosts = 50;
const headerAliases = {
  date: ["Дата публикации"],
  time: ["Время публикации", "Время"],
  postType: ["Тип публикации", "Тип поста"],
  channel: ["Площадка", "Канал"],
  format: ["Формат"],
  topic: ["Тема / заголовок", "Тема", "Заголовок"],
  audience: ["Для кого пост", "Аудитория"],
  keyFacts: [
    "Что рассказать (условия, ключевые факты)",
    "Что рассказать",
    "Ключевые факты",
  ],
  callToAction: ["Призыв к действию / ссылка", "Призыв к действию", "Ссылка"],
  styleGuidance: ["Стиль и ограничения", "Стиль"],
  imagePrompt: ["Промт для изображения", "Промт на изображение"],
  sourceImageRecommendation: [
    "Исходное изображение (файл или рекомендация)",
    "Исходное изображение",
    "Рекомендация по изображению",
  ],
} as const;

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/[^\p{L}\p{N}]/gu, "");

const valueAsText = (value: unknown) =>
  value === null || value === undefined ? "" : String(value).trim();

const parseDate = (value: unknown): string | null => {
  let year: number;
  let month: number;
  let day: number;

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    year = value.getUTCFullYear();
    month = value.getUTCMonth() + 1;
    day = value.getUTCDate();
  } else if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = SSF.parse_date_code(value);
    if (!parsed) return null;
    ({ y: year, m: month, d: day } = parsed);
  } else {
    const text = valueAsText(value);
    const match = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/u.exec(text);
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(text);
    if (match) {
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    } else if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]);
      day = Number(isoMatch[3]);
    } else {
      return null;
    }
  }

  const checked = new Date(Date.UTC(year, month - 1, day));
  if (
    checked.getUTCFullYear() !== year ||
    checked.getUTCMonth() + 1 !== month ||
    checked.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const parseTime = (value: unknown): string => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const totalMinutes = Math.round((((value % 1) + 1) % 1) * 24 * 60);
    const minutes = totalMinutes % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  const text = valueAsText(value);
  if (!text) return "12:00";
  const match = /^(\d{1,2}):([0-5]\d)$/u.exec(text);
  if (!match) return "";
  const hour = Number(match[1]);
  if (hour > 23) return "";
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
};

const parseChannel = (value: unknown) => {
  const channel = normalizeHeader(value);
  if (channel === "vk" || channel === "вконтакте") return "vk";
  if (channel === "telegram" || channel === "телеграм") return "telegram";
  if (channel === "max" || channel === "макс") return "max";
  if (channel === "instagram" || channel === "инстаграм") return "instagram";
  if (
    channel === "zen" ||
    channel === "дзен" ||
    channel === "яндексдзен" ||
    channel === "яндексзен"
  ) {
    return "zen";
  }
  return null;
};

const findHeaderRow = (rows: unknown[][]) => {
  const required = ["date", "postType", "channel", "format", "topic"] as const;
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 20); rowIndex += 1) {
    const headers = new Map(
      (rows[rowIndex] ?? []).map((value, columnIndex) => [
        normalizeHeader(value),
        columnIndex,
      ]),
    );
    const columns = Object.fromEntries(
      Object.entries(headerAliases).map(([field, aliases]) => [
        field,
        aliases
          .map((alias) => headers.get(normalizeHeader(alias)))
          .find((index) => index !== undefined),
      ]),
    ) as Record<keyof typeof headerAliases, number | undefined>;
    if (required.every((field) => columns[field] !== undefined)) {
      return { columns, rowIndex };
    }
  }
  throw new HttpError(
    400,
    "CONTENT_PLAN_HEADERS_INVALID",
    "Не нашёл строку заголовков. Используйте шаблон с колонками «Дата публикации», «Тип публикации», «Площадка», «Формат» и «Тема / заголовок».",
  );
};

const isBlankRow = (row: unknown[]) =>
  row.every((cell) => valueAsText(cell) === "");

export const parseContentPlanFile = (
  content: Buffer,
  fileName: string,
): ContentPlanPostInput[] => {
  if (!fileName.toLocaleLowerCase("ru-RU").endsWith(".xlsx")) {
    throw new HttpError(
      400,
      "CONTENT_PLAN_FILE_TYPE_INVALID",
      "Загрузите контент-план в формате XLSX по шаблону.",
    );
  }
  if (content.length < 4 || content.subarray(0, 2).toString("ascii") !== "PK") {
    throw new HttpError(
      400,
      "CONTENT_PLAN_FILE_INVALID",
      "Не удалось прочитать файл XLSX. Проверьте формат файла и попробуйте ещё раз.",
    );
  }

  let rows: unknown[][];
  try {
    const workbook = read(content, {
      type: "buffer",
      cellDates: true,
      sheetRows: 80,
    });
    const sheetName =
      workbook.SheetNames.find(
        (name) => normalizeHeader(name) === normalizeHeader("Контент-план"),
      ) ?? workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet) throw new Error("No worksheet");
    rows = utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      400,
      "CONTENT_PLAN_FILE_INVALID",
      "Файл не удалось прочитать как таблицу XLSX. Пересохраните его в Excel и попробуйте ещё раз.",
    );
  }

  const { columns, rowIndex: headerRowIndex } = findHeaderRow(rows);
  const posts: ContentPlanPostInput[] = [];
  for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    if (isBlankRow(row)) continue;
    const rowNumber = index + 1;
    const readField = (field: keyof typeof columns) => {
      const column = columns[field];
      return column === undefined ? "" : row[column];
    };
    const channel = parseChannel(readField("channel"));
    const date = parseDate(readField("date"));
    const time = parseTime(readField("time"));
    const parsed = contentPlanPostInputSchema.safeParse({
      sourceRow: rowNumber,
      date: date ?? "",
      time,
      postType: valueAsText(readField("postType")),
      channel,
      format: valueAsText(readField("format")),
      topic: valueAsText(readField("topic")),
      audience: valueAsText(readField("audience")),
      keyFacts: valueAsText(readField("keyFacts")),
      callToAction: valueAsText(readField("callToAction")),
      styleGuidance: valueAsText(readField("styleGuidance")),
      imagePrompt: valueAsText(readField("imagePrompt")),
      sourceImageRecommendation: valueAsText(
        readField("sourceImageRecommendation"),
      ),
    });
    if (!parsed.success) {
      const labels = parsed.error.issues
        .map((issue) => issue.path.join(".") || "строка")
        .slice(0, 3)
        .join(", ");
      const reason = !date
        ? "проверьте дату публикации"
        : !channel
          ? `площадка «${valueAsText(readField("channel"))}» пока не поддерживается`
          : `проверьте поля: ${labels}`;
      throw new HttpError(
        400,
        "CONTENT_PLAN_ROW_INVALID",
        `Строка ${rowNumber}: ${reason}. Поддерживаются VK, Telegram, MAX, Instagram и Яндекс.Дзен.`,
        {
          row: rowNumber,
          fields: parsed.error.issues.map((issue) => issue.path.join(".")),
        },
      );
    }
    posts.push(parsed.data);
    if (posts.length > maxPosts) {
      throw new HttpError(
        400,
        "CONTENT_PLAN_TOO_MANY_POSTS",
        `За один раз можно обработать не более ${maxPosts} публикаций.`,
      );
    }
  }

  if (posts.length === 0) {
    throw new HttpError(
      400,
      "CONTENT_PLAN_EMPTY",
      "В таблице нет заполненных публикаций. Добавьте хотя бы одну строку под заголовками.",
    );
  }
  return posts;
};
