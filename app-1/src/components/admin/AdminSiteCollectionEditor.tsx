import { useState } from "react";
import { useForm } from "react-hook-form";

import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Save, Trash2, Upload } from "lucide-react";

import { Form } from "@/components/Form";
import { SITE_COLLECTIONS } from "@/lib/site/content-collections";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { uploadSiteMedia } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

type CollectionSection = keyof typeof SITE_COLLECTIONS;

const getItemLabel = (item: unknown, index: number) => {
  if (item && typeof item === "object") {
    const value = item as Record<string, unknown>;
    for (const key of ["title", "name", "label", "question"]) {
      if (typeof value[key] === "string") return value[key];
    }
  }
  return `Элемент ${index + 1}`;
};

export const AdminSiteCollectionEditor = ({
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<unknown[]>(
    (initialStored?.content.items as unknown[] | undefined) ?? [
      ...(collections[firstItemKey] ?? []),
    ],
  );
  const form = useForm({
    defaultValues: {
      itemKey: firstItemKey,
      json: JSON.stringify(previewItems, null, 2),
    },
  });
  const save = useSaveAdminSiteContent();
  const upload = useMutation({
    mutationFn: uploadSiteMedia,
    onSuccess: (asset) => {
      const next = [
        ...previewItems,
        {
          title: asset.fileName,
          fileName: asset.fileName,
          href: asset.url,
          previewHref: asset.previewUrl,
        },
      ];
      setPreviewItems(next);
      form.setValue("json", JSON.stringify(next, null, 2));
    },
  });
  const selectCollection = (key: string) => {
    form.setValue("itemKey", key);
    const item = items.find((entry) => entry.itemKey === key);
    const nextItems = (item?.content.items as unknown[] | undefined) ?? [
      ...(collections[key] ?? []),
    ];
    setPreviewItems(nextItems);
    form.setValue("json", JSON.stringify(nextItems, null, 2));
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
          setPreviewItems(parsed);
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
          <h3 className="text-2xl font-semibold">Коллекции страницы</h3>
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {previewItems.slice(0, 6).map((item, index) => (
          <article
            className="rounded-2xl border border-line bg-page p-4"
            key={`${form.getValues("itemKey")}-${index}`}
          >
            <span className="text-xs font-semibold text-brand">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="mt-2 line-clamp-2 font-semibold">
              {getItemLabel(item, index)}
            </p>
            <button
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-destructive"
              onClick={() => {
                const next = previewItems.filter(
                  (_, itemIndex) => itemIndex !== index,
                );
                setPreviewItems(next);
                form.setValue("json", JSON.stringify(next, null, 2));
              }}
              type="button"
            >
              <Trash2 className="size-3" /> Удалить
            </button>
          </article>
        ))}
      </div>

      <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-brand">
        <Upload className="size-4" /> Загрузить файл
        <input
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file);
            event.target.value = "";
          }}
          type="file"
        />
      </label>

      <button
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand"
        onClick={() => setAdvancedOpen((current) => !current)}
        type="button"
      >
        <ChevronDown
          className={`size-4 transition ${advancedOpen ? "rotate-180" : ""}`}
        />
        {advancedOpen ? "Скрыть редактор данных" : "Редактировать данные"}
      </button>

      {advancedOpen && (
        <>
          <textarea
            className="mt-4 min-h-96 w-full rounded-2xl border border-line bg-page p-4 font-mono text-sm outline-none focus:border-focus"
            {...form.register("json")}
          />
          {form.formState.errors.json?.message && (
            <p className="mt-2 text-sm text-destructive">
              {form.formState.errors.json.message}
            </p>
          )}
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
            type="submit"
          >
            <Save className="size-4" />
            Сохранить коллекцию
          </button>
        </>
      )}
    </Form>
  );
};
