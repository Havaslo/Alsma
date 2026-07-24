import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Plus, Save, Trash2 } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import {
  type HomeReviewsFormValues,
  getReviewDefaults,
} from "@/lib/site/admin-home-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

const sourceOptions = [
  { label: "Яндекс Карты", value: "Яндекс Карты" },
  { label: "2ГИС", value: "2ГИС" },
  { label: "Google Карты", value: "Google Карты" },
] as const;

export const AdminHomeReviewsForm = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const save = useSaveAdminSiteContent();
  const form = useForm<HomeReviewsFormValues>({
    defaultValues: getReviewDefaults(items),
  });
  const reviews = useFieldArray({ control: form.control, name: "items" });
  const values = useWatch({ control: form.control, name: "items" });

  return (
    <Form
      className="space-y-5"
      form={form}
      onSubmit={(values) =>
        save.mutate({
          content: {
            items: [...values.items].sort(
              (left, right) => left.sortOrder - right.sortOrder,
            ),
          },
          itemKey: "reviews",
          position: 2,
          section: "home",
          status: "published",
          title: "Отзывы",
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:flex-row sm:items-start sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-brand">Отзывы</h2>
          <p className="mt-1 text-sm leading-6 text-muted-ui-foreground">
            Управляйте текстом, источником, фотографией и порядком отзывов.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              reviews.append({
                image: "",
                imageName: "",
                isActive: true,
                name: "",
                sortOrder: reviews.fields.length,
                source: "Яндекс Карты",
                text: "",
              })
            }
            variant="secondary"
          >
            <Plus className="size-4" />
            Добавить отзыв
          </Button>
          <Button disabled={save.isPending} type="submit">
            <Save className="size-4" />
            Сохранить отзывы
          </Button>
        </div>
      </header>

      {reviews.fields.map((review, index) => (
        <article
          className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:p-6"
          key={review.id}
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-brand">
              Отзыв {index + 1}
            </h3>
            <Button
              className="text-destructive"
              onClick={() => reviews.remove(index)}
              variant="secondary"
            >
              <Trash2 className="size-4" />
              Удалить
            </Button>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <TextField
              error={form.formState.errors.items?.[index]?.name?.message}
              label="Имя"
              {...form.register(`items.${index}.name`, {
                required: "Введите имя.",
              })}
            />
            <label className="block text-sm font-medium">
              <span>Источник</span>
              <DropdownSelect
                ariaLabel={`Источник отзыва ${index + 1}`}
                className="mt-2"
                onChange={(source) =>
                  form.setValue(`items.${index}.source`, source, {
                    shouldDirty: true,
                  })
                }
                options={sourceOptions}
                triggerClassName="field-control"
                value={values[index]?.source ?? "Яндекс Карты"}
              />
            </label>
          </div>

          <div className="mt-5">
            <TextAreaField
              error={form.formState.errors.items?.[index]?.text?.message}
              label="Текст отзыва"
              rows={5}
              {...form.register(`items.${index}.text`, {
                required: "Введите текст отзыва.",
              })}
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
                label="URL фото"
                {...form.register(`items.${index}.image`)}
              />
              <MediaUploadField
                currentName={values[index]?.imageName}
                currentUrl={values[index]?.image}
                label="Загрузить фото"
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
