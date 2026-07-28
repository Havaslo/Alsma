import { Controller, useForm, useWatch } from "react-hook-form";

import { Send } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import type {
  KnowledgeArticle,
  KnowledgeArticleInput,
} from "@/lib/admin/knowledge-base-api";
import {
  usePublishKnowledgeArticle,
  useSaveKnowledgeArticle,
} from "@/lib/admin/useKnowledgeBase";

type ArticleFormValues = Omit<KnowledgeArticleInput, "id">;
type KnowledgeChannel = KnowledgeArticle["channels"][number];

const STATUS_OPTIONS = [
  { label: "Черновик", value: "draft" },
  { label: "Опубликовано", value: "published" },
  { label: "Архив", value: "archived" },
] as const;

export const KnowledgeArticleEditor = ({
  article,
}: {
  readonly article?: KnowledgeArticle;
}) => {
  const save = useSaveKnowledgeArticle();
  const publish = usePublishKnowledgeArticle();
  const form = useForm<ArticleFormValues>({
    defaultValues: {
      category: article?.category ?? "",
      channels: article?.channels ?? ["text", "voice"],
      content: article?.content ?? "",
      slug: article?.slug ?? "",
      status: article?.status ?? "draft",
      summary: article?.summary ?? "",
      tags: article?.tags ?? [],
      title: article?.title ?? "",
    },
  });
  const channels = useWatch({ control: form.control, name: "channels" });
  const toggleChannel = (channel: KnowledgeChannel, checked: boolean) => {
    const next = checked
      ? [...new Set([...channels, channel])]
      : channels.filter((item) => item !== channel);
    if (next.length) form.setValue("channels", next, { shouldDirty: true });
  };

  return (
    <Form
      className="space-y-5"
      form={form}
      onSubmit={(values) => save.mutate({ ...values, id: article?.id })}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <TextField
          error={form.formState.errors.title?.message}
          label="Название статьи"
          placeholder="..."
          {...form.register("title", { required: "Укажите название" })}
        />
        <TextField label="Slug" placeholder="..." {...form.register("slug")} />
      </div>
      <TextField
        label="Краткое описание"
        placeholder="..."
        {...form.register("summary")}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <TextField
          label="Категория"
          placeholder="..."
          {...form.register("category")}
        />
        <Controller
          control={form.control}
          name="tags"
          render={({ field }) => (
            <TextField
              label="Теги"
              onBlur={field.onBlur}
              onChange={(event) =>
                field.onChange(
                  event.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                )
              }
              placeholder="..."
              value={field.value.join(", ")}
            />
          )}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <span className="text-sm font-medium">Каналы</span>
          <div className="mt-2 flex flex-wrap gap-3">
            <CheckboxField
              checked={channels.includes("text")}
              label="Текст"
              onChange={(checked) => toggleChannel("text", checked)}
            />
            <CheckboxField
              checked={channels.includes("voice")}
              label="Голос"
              onChange={(checked) => toggleChannel("voice", checked)}
            />
          </div>
        </div>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <label className="block text-sm font-medium">
              <span>Статус</span>
              <DropdownSelect
                ariaLabel="Статус статьи"
                className="mt-2"
                onChange={field.onChange}
                options={STATUS_OPTIONS}
                triggerClassName="field-control"
                value={field.value}
              />
            </label>
          )}
        />
      </div>
      <TextAreaField
        error={form.formState.errors.content?.message}
        label="Текст статьи"
        placeholder="..."
        rows={14}
        {...form.register("content", { required: "Добавьте текст статьи" })}
      />
      <div className="flex flex-wrap justify-end gap-3">
        {article && article.status !== "published" && (
          <Button
            disabled={publish.isPending}
            onClick={() => publish.mutate(article.id)}
            variant="secondary"
          >
            <Send className="size-4" />
            Опубликовать
          </Button>
        )}
        <Button disabled={save.isPending} type="submit">
          Сохранить статью
        </Button>
      </div>
    </Form>
  );
};
