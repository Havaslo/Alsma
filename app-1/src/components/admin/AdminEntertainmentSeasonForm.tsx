import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Plus, Save, Trash2 } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import {
  type SeasonalActivityForm,
  getSeasonDefaults,
} from "@/lib/site/entertainment-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

type FormValues = { items: SeasonalActivityForm[] };

export const AdminEntertainmentSeasonForm = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const [deleteIndex, setDeleteIndex] = useState<number>();
  const save = useSaveAdminSiteContent();
  const form = useForm<FormValues>({ defaultValues: getSeasonDefaults(items) });
  const cards = useFieldArray({ control: form.control, name: "items" });
  const values = useWatch({ control: form.control, name: "items" });

  return (
    <Form
      form={form}
      onSubmit={(formValues) =>
        save.mutate({
          content: {
            items: [...formValues.items].sort(
              (left, right) => left.sortOrder - right.sortOrder,
            ),
          },
          itemKey: "seasonal-slides",
          position: 1,
          section: "entertainment",
          status: "published",
          title: "Сезонные активности",
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-6 sm:flex-row">
        <div>
          <h2 className="text-lg font-semibold text-brand">
            Сезонные активности
          </h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Баннеры с изображением, описанием и четырьмя пунктами.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              cards.append({
                description: "",
                image: "",
                imageName: "",
                isActive: true,
                items: ["", "", "", ""],
                label: "",
                sortOrder: cards.fields.length,
                title: "",
              })
            }
            variant="secondary"
          >
            <Plus className="size-4" /> Добавить баннер
          </Button>
          <Button disabled={save.isPending} type="submit">
            <Save className="size-4" /> Сохранить баннеры
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
              label="Показывать баннер"
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
              label="Метка сезона"
              placeholder="..."
              {...form.register(`items.${index}.label`, { required: true })}
            />
          </div>
          <div className="mt-5">
            <TextAreaField
              label="Описание"
              placeholder="..."
              {...form.register(`items.${index}.description`)}
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
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {[0, 1, 2, 3].map((pointIndex) => (
              <TextField
                key={pointIndex}
                label={`Пункт ${pointIndex + 1}`}
                placeholder="..."
                {...form.register(`items.${index}.items.${pointIndex}`)}
              />
            ))}
          </div>
        </article>
      ))}
      <ConfirmModal
        confirmLabel="Удалить баннер"
        onClose={() => setDeleteIndex(undefined)}
        onConfirm={() => {
          if (deleteIndex !== undefined) cards.remove(deleteIndex);
          setDeleteIndex(undefined);
        }}
        open={deleteIndex !== undefined}
        title="Удалить сезонный баннер?"
      >
        Баннер будет удалён после сохранения изменений.
      </ConfirmModal>
    </Form>
  );
};
