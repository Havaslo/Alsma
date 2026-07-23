import { useState } from "react";
import { useForm } from "react-hook-form";

import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";

import { Form } from "@/components/Form";
import { Loader } from "@/components/ui/Loader";
import { SITE_COLLECTIONS } from "@/lib/site/content-collections";
import { PUBLIC_PAGES, type PublicPageKey } from "@/lib/site/public-pages";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { uploadSiteMedia } from "@/lib/site/site-content-api";
import {
  useAdminSiteContent,
  useSaveAdminSiteContent,
} from "@/lib/site/useSiteContent";

const sections = Object.keys(PUBLIC_PAGES) as PublicPageKey[];

type ContentFormProps = {
  section: PublicPageKey;
  stored?: SiteContentItem;
};

type ContentFormValues = {
  description: string;
  image: string;
  status: SiteContentItem["status"];
  title: string;
};

const ContentForm = ({ section, stored }: ContentFormProps) => {
  const fallback = PUBLIC_PAGES[section];
  const save = useSaveAdminSiteContent();
  const form = useForm<ContentFormValues>({
    defaultValues: {
      description:
        typeof stored?.content.description === "string"
          ? stored.content.description
          : fallback.description,
      image:
        typeof stored?.content.image === "string"
          ? stored.content.image
          : fallback.heroImage,
      status: stored?.status ?? "published",
      title:
        typeof stored?.content.title === "string"
          ? stored.content.title
          : fallback.title,
    },
  });
  const upload = useMutation({
    mutationFn: uploadSiteMedia,
    onSuccess: ({ data }) => {
      const mediaUrl = new URL(data.file.url, window.location.origin);
      mediaUrl.searchParams.set("contentType", data.file.contentType);
      form.setValue("image", `${mediaUrl.pathname}${mediaUrl.search}`);
    },
  });

  return (
    <Form
      className="mt-6 grid gap-5"
      form={form}
      onSubmit={(values) => {
        save.mutate({
          content: {
            description: values.description,
            image: values.image,
            title: values.title,
          },
          itemKey: "hero",
          position: 0,
          section,
          status: values.status,
          title: "Главный экран",
        });
      }}
    >
      <label className="text-sm font-medium">
        Заголовок
        <input
          className="mt-2 w-full rounded-2xl border border-line bg-page px-4 py-3 outline-none focus:border-focus"
          {...form.register("title")}
        />
      </label>
      <label className="text-sm font-medium">
        Описание
        <textarea
          className="mt-2 min-h-32 w-full rounded-2xl border border-line bg-page px-4 py-3 outline-none focus:border-focus"
          {...form.register("description")}
        />
      </label>
      <label className="text-sm font-medium">
        Изображение или видео hero
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-2xl border border-line bg-page px-4 py-3"
            {...form.register("image")}
          />
          <label className="cursor-pointer rounded-full border border-line px-5 py-3 text-center font-semibold text-brand">
            Загрузить файл
            <input
              accept="image/*,video/mp4,video/webm"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
              }}
              type="file"
            />
          </label>
        </div>
      </label>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <label className="text-sm font-medium">
          Статус
          <select
            className="mt-2 block rounded-xl border border-line bg-page px-4 py-3"
            {...form.register("status")}
          >
            <option value="draft">Черновик</option>
            <option value="published">Опубликовано</option>
            <option value="archived">В архиве</option>
          </select>
        </label>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground disabled:opacity-60"
          disabled={save.isPending}
          type="submit"
        >
          <Save className="size-4" /> Сохранить
        </button>
      </div>
    </Form>
  );
};

type CollectionSection = keyof typeof SITE_COLLECTIONS;
const CollectionForm = ({
  items,
  section,
}: {
  readonly items: SiteContentItem[];
  readonly section: CollectionSection;
}) => {
  const collections = SITE_COLLECTIONS[section] as Record<
    string,
    readonly unknown[]
  >;
  const keys = Object.keys(collections);
  const firstItemKey = keys[0] ?? "items";
  const initialStored = items.find((item) => item.itemKey === firstItemKey);
  const form = useForm({
    defaultValues: {
      itemKey: firstItemKey,
      json: JSON.stringify(
        initialStored?.content.items ?? collections[firstItemKey] ?? [],
        null,
        2,
      ),
    },
  });
  const save = useSaveAdminSiteContent();
  const selectCollection = (key: string) => {
    form.setValue("itemKey", key);
    const item = items.find((entry) => entry.itemKey === key);
    form.setValue(
      "json",
      JSON.stringify(item?.content.items ?? collections[key] ?? [], null, 2),
    );
    form.clearErrors("json");
  };

  return (
    <Form
      className="mt-8 border-t border-line pt-6"
      form={form}
      onSubmit={(values) => {
        try {
          const parsed = JSON.parse(values.json) as unknown;
          if (!Array.isArray(parsed)) throw new Error();
          form.clearErrors("json");
          save.mutate({
            content: { items: parsed },
            itemKey: values.itemKey,
            position: 10,
            section,
            status: "published",
            title: values.itemKey,
          });
        } catch {
          form.setError("json", {
            message: "Введите корректный JSON-массив.",
            type: "validate",
          });
        }
      }}
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-heading text-2xl font-semibold">
            Коллекции страницы
          </h3>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Карточки и списки публикуются сразу после сохранения.
          </p>
        </div>
        <select
          className="rounded-xl border border-line bg-page px-4 py-3"
          {...form.register("itemKey", {
            onChange: (event) => selectCollection(event.target.value),
          })}
        >
          {keys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="mt-4 min-h-96 w-full rounded-2xl border border-line bg-page p-4 font-mono text-sm outline-none focus:border-focus"
        {...form.register("json")}
      />
      {form.formState.errors.json?.message && (
        <p className="text-danger mt-2 text-sm">
          {form.formState.errors.json.message}
        </p>
      )}
      <button
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
        type="submit"
      >
        <Save className="size-4" /> Сохранить коллекцию
      </button>
    </Form>
  );
};

export const AdminSiteContentEditor = () => {
  const [section, setSection] = useState<PublicPageKey>("rooms");
  const content = useAdminSiteContent(section);
  const stored = content.data?.items.find((item) => item.itemKey === "hero");

  return (
    <section className="rounded-3xl border border-line bg-brand-foreground p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-semibold">Главный блок страницы</h2>
          <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
            Редактируйте опубликованные страницы и их коллекции.
          </p>
        </div>
        <select
          className="rounded-xl border border-line bg-page px-4 py-3"
          onChange={(event) => setSection(event.target.value as PublicPageKey)}
          value={section}
        >
          {sections.map((key) => (
            <option key={key} value={key}>
              {PUBLIC_PAGES[key].eyebrow}
            </option>
          ))}
        </select>
      </div>
      {content.isLoading ? (
        <div className="grid place-items-center p-12">
          <Loader className="text-brand" />
        </div>
      ) : (
        <>
          <ContentForm
            key={`${section}:${stored?.id ?? "new"}`}
            section={section}
            stored={stored}
          />
          {section in SITE_COLLECTIONS && (
            <CollectionForm
              items={content.data?.items ?? []}
              key={`collections:${section}`}
              section={section as CollectionSection}
            />
          )}
        </>
      )}
    </section>
  );
};
