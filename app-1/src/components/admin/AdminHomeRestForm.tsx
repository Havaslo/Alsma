import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Plus, Save, Trash2 } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import {
  type HomeRestFormValues,
  getRestDefaults,
  splitTags,
} from "@/lib/site/admin-home-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

const emptyCard = {
  description: "",
  href: "",
  image: "",
  imageName: "",
  isActive: true,
  price: "",
  sortOrder: 0,
  tags: "",
  title: "",
} as const;

export const AdminHomeRestForm = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const save = useSaveAdminSiteContent();
  const form = useForm<HomeRestFormValues>({
    defaultValues: getRestDefaults(items),
  });
  const cards = useFieldArray({ control: form.control, name: "items" });
  const values = useWatch({ control: form.control, name: "items" });

  return (
    <Form
      className="space-y-5"
      form={form}
      onSubmit={(values) =>
        save.mutate({
          content: {
            items: values.items
              .map((item) => ({ ...item, tags: splitTags(item.tags) }))
              .sort((left, right) => left.sortOrder - right.sortOrder),
          },
          itemKey: "ideal-rest",
          position: 1,
          section: "home",
          status: "published",
          title: "Идеальный отдых",
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:flex-row sm:items-start sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-brand">
            Блок «Идеальный отдых»
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-ui-foreground">
            Карточки сценариев отдыха полностью редактируются и меняют порядок.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              cards.append({ ...emptyCard, sortOrder: cards.fields.length })
            }
            variant="secondary"
          >
            <Plus className="size-4" />
            Добавить карточку
          </Button>
          <Button disabled={save.isPending} type="submit">
            <Save className="size-4" />
            Сохранить карточки
          </Button>
        </div>
      </header>

      {cards.fields.map((card, index) => (
        <article
          className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:p-6"
          key={card.id}
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-brand">
              Карточка {index + 1}
            </h3>
            <Button
              className="text-destructive"
              onClick={() => cards.remove(index)}
              variant="secondary"
            >
              <Trash2 className="size-4" />
              Удалить
            </Button>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <TextField
              error={form.formState.errors.items?.[index]?.title?.message}
              label="Название"
              {...form.register(`items.${index}.title`, {
                required: "Введите название.",
              })}
            />
            <TextField
              error={form.formState.errors.items?.[index]?.price?.message}
              label="Цена"
              placeholder="от 25 000 ₽"
              {...form.register(`items.${index}.price`, {
                required: "Введите цену.",
              })}
            />
          </div>

          <div className="mt-5">
            <TextAreaField
              error={form.formState.errors.items?.[index]?.description?.message}
              label="Описание"
              {...form.register(`items.${index}.description`, {
                required: "Введите описание.",
              })}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <TextField
              label="Теги"
              placeholder="2 ночи, SPA-ритуал, Завтрак включён"
              {...form.register(`items.${index}.tags`)}
            />
            <TextField
              label="Ссылка кнопки"
              placeholder="/spa"
              {...form.register(`items.${index}.href`)}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_2fr]">
            <div className="space-y-4">
              <TextField
                label="Порядок"
                min={0}
                type="number"
                {...form.register(`items.${index}.sortOrder`, {
                  min: 0,
                  valueAsNumber: true,
                })}
              />
              <CheckboxField
                checked={values[index]?.isActive ?? false}
                label="Показывать на сайте"
                onChange={(checked) =>
                  form.setValue(`items.${index}.isActive`, checked, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="space-y-4">
              <TextField
                label="URL изображения"
                {...form.register(`items.${index}.image`, {
                  required: "Укажите или загрузите изображение.",
                })}
              />
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
          </div>
        </article>
      ))}
    </Form>
  );
};
