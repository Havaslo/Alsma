import { useState } from "react";
import { useForm } from "react-hook-form";

import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";

import { Form } from "@/components/Form";
import { AdminSiteCollectionEditor } from "@/components/admin/AdminSiteCollectionEditor";
import { Loader } from "@/components/ui/Loader";
import { SITE_COLLECTIONS } from "@/lib/site/content-collections";
import { PUBLIC_PAGES, type PublicPageKey } from "@/lib/site/public-pages";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { uploadSiteMedia } from "@/lib/site/site-content-api";
import {
  useAdminSiteContent,
  useSaveAdminSiteContent,
} from "@/lib/site/useSiteContent";

const sections: PublicPageKey[] = [
  "home",
  "rooms",
  "spa",
  "entertainment",
  "all-inclusive",
  "offers",
  "news",
  "blog",
  "celebrations",
  "hardware-procedures",
  "about",
  "privacy",
];

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
    onSuccess: (asset) => form.setValue("image", asset.url),
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

export const AdminSiteContentEditor = () => {
  const [section, setSection] = useState<PublicPageKey>("home");
  const content = useAdminSiteContent(section);
  const stored = content.data?.items?.find((item) => item.itemKey === "hero");

  return (
    <div className="space-y-5">
      <nav className="flex gap-2 overflow-x-auto border-b border-line pb-3">
        {sections.map((key) => (
          <button
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              section === key
                ? "bg-brand text-brand-foreground"
                : "border border-line bg-brand-foreground text-brand"
            }`}
            key={key}
            onClick={() => setSection(key)}
            type="button"
          >
            {PUBLIC_PAGES[key].eyebrow}
          </button>
        ))}
      </nav>

      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-brand">
              {PUBLIC_PAGES[section].eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Hero-блок</h2>
            <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
              Редактируйте первый экран страницы: заголовок, описание и медиа.
            </p>
          </div>
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
              <AdminSiteCollectionEditor
                items={content.data?.items ?? []}
                key={`collections:${section}`}
                section={section as keyof typeof SITE_COLLECTIONS}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
};
