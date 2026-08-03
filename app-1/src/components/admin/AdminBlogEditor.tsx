import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import { Plus, Save, Trash2 } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import { Loader } from "@/components/ui/Loader";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import {
  BLOG_CATEGORY_OPTIONS,
  type BlogItemForm,
  formatBlogDate,
  getBlogDefaults,
} from "@/lib/site/blog-content";
import {
  useAdminSiteContent,
  useSaveAdminSiteContent,
} from "@/lib/site/useSiteContent";

type FormValues = { items: BlogItemForm[] };

export const AdminBlogEditor = () => {
  const [deleteIndex, setDeleteIndex] = useState<number>();
  const content = useAdminSiteContent("blog");
  const save = useSaveAdminSiteContent();
  const storedItems = content.data?.items?.find(
    (item) => item.itemKey === "items",
  )?.content.items;
  const form = useForm<FormValues>({
    values: content.data
      ? getBlogDefaults(Array.isArray(storedItems) ? storedItems : undefined)
      : undefined,
  });
  const cards = useFieldArray({ control: form.control, name: "items" });
  const values = useWatch({ control: form.control, name: "items" });

  if (content.isLoading)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader className="text-brand" label="Загрузка редактора" size="lg" />
      </div>
    );

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold tracking-wide text-muted-ui-foreground uppercase">
          Управление сайтом
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-brand">Блог</h1>
        <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
          Редактируйте карточки статей и полный текст, который открывается в
          модальном окне.
        </p>
      </section>
      <Form
        form={form}
        onSubmit={(formValues) =>
          save.mutate({
            content: {
              items: formValues.items
                .map((item) => ({
                  ...item,
                  buttonText: "Читать статью",
                  date: formatBlogDate(item.dateValue),
                  tags: [item.tag].filter(Boolean),
                }))
                .sort(
                  (left, right) =>
                    (left.sortOrder ?? 0) - (right.sortOrder ?? 0),
                ),
            },
            itemKey: "items",
            position: 1,
            section: "blog",
            status: "published",
            title: "Блог",
          })
        }
      >
        <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-6 sm:flex-row">
          <div>
            <h2 className="text-lg font-semibold text-brand">Статьи</h2>
            <p className="mt-1 text-sm text-muted-ui-foreground">
              Краткое описание показывается на карточке, полный текст — в
              статье.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                cards.append({
                  buttonLink: "",
                  buttonText: "Читать статью",
                  category: "stories",
                  dateValue: "",
                  description: "",
                  details: "",
                  image: "",
                  imageName: "",
                  isActive: true,
                  sortOrder: cards.fields.length,
                  tag: "",
                  title: "",
                })
              }
              variant="secondary"
            >
              <Plus className="size-4" /> Добавить статью
            </Button>
            <Button disabled={save.isPending} type="submit">
              <Save className="size-4" /> Сохранить статьи
            </Button>
          </div>
        </header>
        {cards.fields.map((card, index) => (
          <article
            className="rounded-3xl border border-line bg-brand-foreground p-6"
            key={card.id}
          >
            <div className="mb-5 grid gap-4 sm:grid-cols-3 sm:items-end">
              <TextField
                label="Порядок"
                min={0}
                type="number"
                {...form.register(`items.${index}.sortOrder`, {
                  valueAsNumber: true,
                })}
              />
              <CheckboxField
                checked={values[index]?.isActive ?? false}
                className="w-full"
                label="Показывать статью"
                onChange={(checked) =>
                  form.setValue(`items.${index}.isActive`, checked, {
                    shouldDirty: true,
                  })
                }
              />
              <Button
                className="w-full text-destructive"
                onClick={() => setDeleteIndex(index)}
                variant="secondary"
              >
                <Trash2 className="size-4" /> Удалить
              </Button>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField
                label="Заголовок"
                placeholder="..."
                {...form.register(`items.${index}.title`, { required: true })}
              />
              <TextField
                label="Тег"
                placeholder="..."
                {...form.register(`items.${index}.tag`)}
              />
            </div>
            <div className="mt-5">
              <TextAreaField
                label="Описание в карточке"
                placeholder="..."
                {...form.register(`items.${index}.description`)}
              />
            </div>
            <div className="mt-5">
              <TextAreaField
                label="Полный текст статьи"
                placeholder="Текст, который откроется после нажатия «Читать статью»"
                rows={8}
                {...form.register(`items.${index}.details`)}
              />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <label className="block text-sm font-medium text-panel-foreground">
                <span>Тема статьи</span>
                <span className="mt-2 block rounded-xl border border-line bg-page px-4 py-2.5">
                  <Controller
                    control={form.control}
                    name={`items.${index}.category`}
                    render={({ field }) => (
                      <DropdownSelect
                        ariaLabel={`Тема статьи ${index + 1}`}
                        onChange={field.onChange}
                        options={BLOG_CATEGORY_OPTIONS}
                        value={field.value}
                      />
                    )}
                  />
                </span>
              </label>
              <TextField
                label="Дата статьи"
                type="date"
                {...form.register(`items.${index}.dateValue`)}
              />
            </div>
            <div className="mt-5">
              <MediaUploadField
                currentName={values[index]?.imageName}
                currentUrl={values[index]?.image}
                label="Загрузить изображение"
                onUploaded={(asset) => {
                  form.setValue(`items.${index}.image`, asset.url, {
                    shouldDirty: true,
                  });
                  form.setValue(`items.${index}.imageName`, asset.fileName, {
                    shouldDirty: true,
                  });
                }}
              />
            </div>
          </article>
        ))}
        <ConfirmModal
          confirmLabel="Удалить статью"
          onClose={() => setDeleteIndex(undefined)}
          onConfirm={() => {
            if (deleteIndex !== undefined) cards.remove(deleteIndex);
            setDeleteIndex(undefined);
          }}
          open={deleteIndex !== undefined}
          title="Удалить статью?"
        >
          Карточка будет удалена после сохранения статей.
        </ConfirmModal>
      </Form>
    </div>
  );
};
