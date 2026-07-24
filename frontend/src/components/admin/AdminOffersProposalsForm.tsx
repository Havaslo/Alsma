import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Plus, Save } from "lucide-react";

import { Form } from "@/components/Form";
import { AdminOfferCardControls } from "@/components/admin/AdminOfferCardControls";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import {
  type ActiveOfferForm,
  getProposalDefaults,
} from "@/lib/site/offers-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

type FormValues = { items: ActiveOfferForm[] };

export const AdminOffersProposalsForm = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const [deleteIndex, setDeleteIndex] = useState<number>();
  const save = useSaveAdminSiteContent();
  const form = useForm<FormValues>({
    defaultValues: getProposalDefaults(items),
  });
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
          itemKey: "proposals",
          position: 1,
          section: "offers",
          status: "published",
          title: "Предложения",
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-6 sm:flex-row">
        <div>
          <h2 className="text-lg font-semibold text-brand">Предложения</h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Карточки актуальных акций с изображением, тегом и ссылкой.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              cards.append({
                buttonLink: "",
                description: "",
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
            <Plus className="size-4" /> Добавить карточку
          </Button>
          <Button disabled={save.isPending} type="submit">
            <Save className="size-4" /> Сохранить предложения
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
            <TextField
              label="Ссылка для кнопки"
              placeholder="..."
              {...form.register(`items.${index}.buttonLink`)}
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
        </article>
      ))}
      <ConfirmModal
        confirmLabel="Удалить карточку"
        onClose={() => setDeleteIndex(undefined)}
        onConfirm={() => {
          if (deleteIndex !== undefined) cards.remove(deleteIndex);
          setDeleteIndex(undefined);
        }}
        open={deleteIndex !== undefined}
        title="Удалить предложение?"
      >
        Карточка будет удалена после сохранения предложений.
      </ConfirmModal>
    </Form>
  );
};
