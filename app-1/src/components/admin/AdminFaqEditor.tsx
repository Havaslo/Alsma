import { useState } from "react";

import { Archive, Plus, Save } from "lucide-react";

import type { SiteContentItem } from "@/lib/site/site-content-api";
import {
  useAdminSiteContent,
  useSaveAdminSiteContent,
} from "@/lib/site/useSiteContent";

type FaqDraft = {
  question: string;
  answer: string;
  category: string;
  position: number;
  status: SiteContentItem["status"];
};

export const AdminFaqEditor = () => {
  const query = useAdminSiteContent("faq");
  const save = useSaveAdminSiteContent();
  const [draft, setDraft] = useState<Record<string, FaqDraft>>({});
  const rows = query.data?.items ?? [];
  const value = (row: SiteContentItem): FaqDraft =>
    draft[row.itemKey] ?? {
      question: String(row.content.question ?? ""),
      answer: String(row.content.answer ?? ""),
      category: String(row.content.category ?? "Общее"),
      position: Number(row.content.position ?? row.position),
      status: row.status,
    };
  const update = (row: SiteContentItem, field: keyof FaqDraft, next: string) =>
    setDraft((current) => ({
      ...current,
      [row.itemKey]: {
        ...value(row),
        [field]: field === "position" ? Math.max(0, Number(next) || 0) : next,
      },
    }));
  const persist = (row: (typeof rows)[number]) => {
    const item = value(row);
    save.mutate({
      section: "faq",
      itemKey: row.itemKey,
      title: item.question,
      position: item.position,
      status: item.status,
      content: {
        question: item.question,
        answer: item.answer,
        category: item.category,
        position: item.position,
      },
    });
  };
  const add = () =>
    save.mutate({
      section: "faq",
      itemKey: `faq-${Date.now()}`,
      title: "Новый вопрос",
      position: rows.length + 1,
      status: "draft",
      content: {
        question: "Новый вопрос",
        answer: "Заполните ответ",
        category: "Общее",
        position: rows.length + 1,
      },
    });
  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold tracking-wide text-muted-ui-foreground uppercase">
          Управление сайтом
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-brand">FAQ</h1>
        <p className="mt-2 text-sm text-muted-ui-foreground">
          Публикация вопросов и ответов на основе фактов сайта. Черновики и
          архив не показываются публично.
        </p>
      </header>
      <button
        className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
        onClick={add}
        type="button"
      >
        <Plus className="size-4" /> Добавить вопрос
      </button>
      {!query.isLoading && !rows.length && (
        <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted-ui-foreground">
          В базе пока нет FAQ. Добавьте реальную запись — она появится здесь как
          черновик и не будет видна на сайте до публикации.
        </p>
      )}
      {rows.map((row) => {
        const item = value(row);
        return (
          <article
            className="rounded-3xl border border-line bg-panel p-5"
            key={row.itemKey}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-ui-foreground">
                Ключ: {row.itemKey}
              </span>
              <span className="rounded-full border border-line px-3 py-1 text-xs">
                {item.status === "published"
                  ? "Опубликовано"
                  : item.status === "archived"
                    ? "В архиве"
                    : "Черновик"}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_12rem]">
              {(["question", "answer", "category"] as const).map((field) => (
                <label className="text-sm font-semibold" key={field}>
                  {field === "question"
                    ? "Вопрос"
                    : field === "answer"
                      ? "Ответ"
                      : "Категория"}
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-xl border border-line bg-page p-3 font-normal"
                    value={item[field]}
                    onChange={(event) => update(row, field, event.target.value)}
                  />
                </label>
              ))}{" "}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-sm">
                Порядок{" "}
                <input
                  className="ml-2 w-20 rounded-lg border border-line bg-page px-2 py-2"
                  type="number"
                  value={item.position}
                  onChange={(event) =>
                    update(row, "position", event.target.value)
                  }
                />
              </label>
              <select
                className="rounded-lg border border-line bg-page px-3 py-2"
                value={item.status}
                onChange={(event) => update(row, "status", event.target.value)}
              >
                <option value="draft">Черновик</option>
                <option value="published">Опубликовано</option>
                <option value="archived">В архиве</option>
              </select>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 font-semibold text-brand-foreground"
                onClick={() => persist(row)}
                type="button"
              >
                <Save className="size-4" /> Сохранить
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2"
                onClick={() => {
                  const archived = { ...item, status: "archived" as const };
                  setDraft((current) => ({
                    ...current,
                    [row.itemKey]: archived,
                  }));
                  save.mutate({
                    section: "faq",
                    itemKey: row.itemKey,
                    title: archived.question,
                    position: archived.position,
                    status: archived.status,
                    content: {
                      question: archived.question,
                      answer: archived.answer,
                      category: archived.category,
                      position: archived.position,
                    },
                  });
                }}
                type="button"
              >
                <Archive className="size-4" /> Архивировать
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
};
