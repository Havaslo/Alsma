import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { FilePenLine, LoaderCircle, Save } from "lucide-react";

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

const ContentForm = ({ section, stored }: ContentFormProps) => {
  const fallback = PUBLIC_PAGES[section];
  const save = useSaveAdminSiteContent();
  const [title, setTitle] = useState(
    typeof stored?.content.title === "string"
      ? stored.content.title
      : fallback.title,
  );
  const [description, setDescription] = useState(
    typeof stored?.content.description === "string"
      ? stored.content.description
      : fallback.description,
  );
  const [status, setStatus] = useState<SiteContentItem["status"]>(
    stored?.status ?? "published",
  );
  const [image, setImage] = useState(
    typeof stored?.content.image === "string"
      ? stored.content.image
      : fallback.heroImage,
  );
  const upload = useMutation({
    mutationFn: uploadSiteMedia,
    onSuccess: ({ data }) => {
      const mediaUrl = new URL(data.file.url, window.location.origin);
      mediaUrl.searchParams.set("contentType", data.file.contentType);
      setImage(`${mediaUrl.pathname}${mediaUrl.search}`);
    },
  });

  return (
    <form
      className="mt-6 grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({
          content: { description, image, title },
          itemKey: "hero",
          position: 0,
          section,
          status,
          title: "Главный экран",
        });
      }}
    >
      <label className="text-sm font-medium">
        Заголовок
        <input
          className="mt-2 w-full rounded-2xl border border-line bg-page px-4 py-3 outline-none focus:border-focus"
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </label>
      <label className="text-sm font-medium">
        Описание
        <textarea
          className="mt-2 min-h-32 w-full rounded-2xl border border-line bg-page px-4 py-3 outline-none focus:border-focus"
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </label>
      <label className="text-sm font-medium">
        Изображение или видео hero
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-2xl border border-line bg-page px-4 py-3"
            onChange={(event) => setImage(event.target.value)}
            value={image}
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
            onChange={(event) =>
              setStatus(event.target.value as SiteContentItem["status"])
            }
            value={status}
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
    </form>
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
  const [itemKey, setItemKey] = useState(keys[0] ?? "items");
  const stored = items.find((item) => item.itemKey === itemKey);
  const [json, setJson] = useState(() =>
    JSON.stringify(
      stored?.content.items ?? collections[itemKey] ?? [],
      null,
      2,
    ),
  );
  const [error, setError] = useState("");
  const save = useSaveAdminSiteContent();
  const selectCollection = (key: string) => {
    setItemKey(key);
    const item = items.find((entry) => entry.itemKey === key);
    setJson(
      JSON.stringify(item?.content.items ?? collections[key] ?? [], null, 2),
    );
    setError("");
  };
  return (
    <form
      className="mt-8 border-t border-line pt-6"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          const parsed = JSON.parse(json) as unknown;
          if (!Array.isArray(parsed)) throw new Error();
          setError("");
          save.mutate({
            content: { items: parsed },
            itemKey,
            position: 10,
            section,
            status: "published",
            title: itemKey,
          });
        } catch {
          setError("Введите корректный JSON-массив.");
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
          onChange={(event) => selectCollection(event.target.value)}
          value={itemKey}
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
        onChange={(event) => setJson(event.target.value)}
        value={json}
      />
      {error && <p className="text-danger mt-2 text-sm">{error}</p>}
      <button
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
        type="submit"
      >
        <Save className="size-4" /> Сохранить коллекцию
      </button>
    </form>
  );
};

export const AdminSiteContentEditor = () => {
  const [section, setSection] = useState<PublicPageKey>("rooms");
  const content = useAdminSiteContent(section);
  const stored = content.data?.items.find((item) => item.itemKey === "hero");

  return (
    <section className="mt-8 rounded-3xl border border-line bg-panel p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-brand">
            <FilePenLine className="size-4" /> Управление сайтом
          </p>
          <h2 className="mt-1 font-heading text-3xl font-semibold">
            Главный блок страницы
          </h2>
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
          <LoaderCircle className="size-7 animate-spin text-brand" />
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
