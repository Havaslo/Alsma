import { useState } from "react";

import { FilePenLine, LoaderCircle, Save } from "lucide-react";

import { PUBLIC_PAGES, type PublicPageKey } from "@/lib/site/public-pages";
import type { SiteContentItem } from "@/lib/site/site-content-api";
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

  return (
    <form
      className="mt-6 grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({
          content: { description, title },
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
        <ContentForm
          key={`${section}:${stored?.id ?? "new"}`}
          section={section}
          stored={stored}
        />
      )}
    </section>
  );
};
