import { useForm } from "react-hook-form";

import { Save, Send } from "lucide-react";

import { Form } from "@/components/Form";
import type { KnowledgeArticle } from "@/lib/admin/knowledge-base-api";
import {
  usePublishKnowledgeArticle,
  useSaveKnowledgeArticle,
} from "@/lib/admin/useKnowledgeBase";

export const KnowledgeArticleEditor = ({
  article,
}: {
  readonly article?: KnowledgeArticle;
}) => {
  const save = useSaveKnowledgeArticle();
  const publish = usePublishKnowledgeArticle();
  const form = useForm<Pick<KnowledgeArticle, "content" | "status" | "title">>({
    defaultValues: {
      content: article?.content ?? "",
      status: article?.status ?? "draft",
      title: article?.title ?? "",
    },
  });

  return (
    <Form
      className="grid gap-4 rounded-3xl border border-line bg-page p-5"
      form={form}
      onSubmit={(values) => {
        save.mutate({ ...values, id: article?.id });
      }}
    >
      <input
        className="rounded-2xl border border-line bg-panel px-4 py-3"
        placeholder="Название статьи"
        {...form.register("title", { required: true })}
      />
      <textarea
        className="min-h-56 rounded-2xl border border-line bg-panel px-4 py-3 leading-7"
        placeholder="Подтверждённая информация для ответов агента"
        {...form.register("content", { required: true })}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <select
          className="rounded-xl border border-line bg-panel px-4 py-3"
          {...form.register("status")}
        >
          <option value="draft">Черновик</option>
          <option value="published">Опубликовано</option>
          <option value="archived">Архив</option>
        </select>
        <div className="flex gap-3">
          {article && article.status !== "published" && (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-brand px-5 py-3 font-semibold text-brand"
              onClick={() => publish.mutate(article.id)}
              type="button"
            >
              <Send className="size-4" /> Опубликовать
            </button>
          )}
          <button
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
            type="submit"
          >
            <Save className="size-4" /> Сохранить
          </button>
        </div>
      </div>
    </Form>
  );
};
