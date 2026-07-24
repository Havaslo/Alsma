import { useState } from "react";
import {
  type Control,
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";

import { Plus, Save } from "lucide-react";

import { Form } from "@/components/Form";
import { AdminOfferCardControls } from "@/components/admin/AdminOfferCardControls";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DatePicker } from "@/components/ui/DatePicker";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import {
  type OfferEventForm,
  getEventDefaults,
  splitOfferList,
} from "@/lib/site/offers-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

type FormValues = { items: OfferEventForm[] };

const getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const OfferDateField = ({
  ariaLabel,
  control,
  label,
  min,
  name,
}: {
  readonly ariaLabel: string;
  readonly control: Control<FormValues>;
  readonly label: string;
  readonly min?: string;
  readonly name: `items.${number}.${"endDate" | "startDate"}`;
}) => (
  <label className="block text-sm font-medium text-panel-foreground">
    <span>{label}</span>
    <span className="mt-2 block rounded-xl border border-line bg-page px-4 py-2.5">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <DatePicker
            ariaLabel={ariaLabel}
            min={min}
            onChange={field.onChange}
            value={field.value}
          />
        )}
      />
    </span>
  </label>
);

export const AdminOffersEventsForm = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const [deleteIndex, setDeleteIndex] = useState<number>();
  const save = useSaveAdminSiteContent();
  const form = useForm<FormValues>({ defaultValues: getEventDefaults(items) });
  const cards = useFieldArray({ control: form.control, name: "items" });
  const values = useWatch({ control: form.control, name: "items" });

  return (
    <Form
      form={form}
      onSubmit={(formValues) =>
        save.mutate({
          content: {
            items: formValues.items
              .map((item) => ({
                ...item,
                items: splitOfferList(item.items),
              }))
              .sort((left, right) => left.sortOrder - right.sortOrder),
          },
          itemKey: "events",
          position: 3,
          section: "offers",
          status: "published",
          title: "Мероприятия",
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-6 sm:flex-row">
        <div>
          <h2 className="text-lg font-semibold text-brand">Мероприятия</h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            События с датами, карточкой и подробным списком программы.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              cards.append({
                date: "",
                description: "",
                endDate: getCurrentDate(),
                image: "",
                imageName: "",
                isActive: true,
                items: "",
                month: "",
                sortOrder: cards.fields.length,
                startDate: getCurrentDate(),
                tag: "",
                title: "",
              })
            }
            variant="secondary"
          >
            <Plus className="size-4" /> Добавить мероприятие
          </Button>
          <Button disabled={save.isPending} type="submit">
            <Save className="size-4" /> Сохранить мероприятия
          </Button>
        </div>
      </header>
      {cards.fields.map((card, index) => (
        <article
          className="rounded-3xl border border-line bg-brand-foreground p-6"
          key={card.id}
        >
          <AdminOfferCardControls
            active={values[index]?.isActive ?? false}
            form={form}
            index={index}
            onDelete={() => setDeleteIndex(index)}
          />
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
              label="Описание / текст карточки"
              placeholder="..."
              {...form.register(`items.${index}.description`)}
            />
          </div>
          <div className="mt-5">
            <TextAreaField
              label="Список для открытой карточки"
              placeholder="..."
              rows={6}
              {...form.register(`items.${index}.items`)}
            />
            <p className="mt-2 text-xs text-muted-ui-foreground">
              Каждый пункт укажите с новой строки.
            </p>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <OfferDateField
              ariaLabel={`Дата начала мероприятия ${index + 1}`}
              control={form.control}
              label="Дата начала"
              name={`items.${index}.startDate`}
            />
            <OfferDateField
              ariaLabel={`Дата окончания мероприятия ${index + 1}`}
              control={form.control}
              label="Дата окончания"
              min={values[index]?.startDate}
              name={`items.${index}.endDate`}
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
        confirmLabel="Удалить мероприятие"
        onClose={() => setDeleteIndex(undefined)}
        onConfirm={() => {
          if (deleteIndex !== undefined) cards.remove(deleteIndex);
          setDeleteIndex(undefined);
        }}
        open={deleteIndex !== undefined}
        title="Удалить мероприятие?"
      >
        Карточка будет удалена после сохранения мероприятий.
      </ConfirmModal>
    </Form>
  );
};
