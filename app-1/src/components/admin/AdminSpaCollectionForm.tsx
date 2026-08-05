import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Plus, Save, Trash2 } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

type SpaRow = Record<string, string>;
type FormValues = { items: SpaRow[] };
type Field = { key: string; label: string; area?: boolean; media?: boolean };
type Props = {
  readonly itemKey: string;
  readonly title: string;
  readonly description: string;
  readonly items?: SiteContentItem[];
  readonly defaults: SpaRow[];
  readonly fields: Field[];
  readonly addLabel: string;
  readonly addItem: SpaRow;
  readonly layout?: "cards" | "table";
};

export const AdminSpaCollectionForm = ({
  itemKey,
  title,
  description,
  items,
  defaults,
  fields,
  addLabel,
  addItem,
  layout = "cards",
}: Props) => {
  const stored = items?.find((item) => item.itemKey === itemKey)?.content.items;
  const initialItems =
    Array.isArray(stored) && stored.length ? (stored as SpaRow[]) : defaults;
  const save = useSaveAdminSiteContent();
  const form = useForm<FormValues>({ defaultValues: { items: initialItems } });
  const rows = useFieldArray({ control: form.control, name: "items" });
  const values = useWatch({ control: form.control, name: "items" });
  const [removeIndex, setRemoveIndex] = useState<number>();
  const input = (field: Field, index: number) => {
    if (field.media) {
      return (
        <MediaUploadField
          currentName={values[index]?.imageName}
          currentUrl={values[index]?.[field.key]}
          label="Загрузить изображение"
          onUploaded={(asset) => {
            form.setValue(`items.${index}.${field.key}`, asset.url, {
              shouldDirty: true,
            });
            form.setValue(`items.${index}.imageName`, asset.fileName, {
              shouldDirty: true,
            });
          }}
        />
      );
    }
    return field.area ? (
      <TextAreaField
        label={field.label}
        {...form.register(`items.${index}.${field.key}`)}
      />
    ) : (
      <TextField
        label={field.label}
        {...form.register(`items.${index}.${field.key}`)}
      />
    );
  };
  return (
    <Form
      className="space-y-5"
      form={form}
      onSubmit={(value) =>
        save.mutate({
          content: { items: value.items },
          itemKey,
          position: 1,
          section: "spa",
          status: "published",
          title,
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:flex-row sm:items-start sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-brand">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-ui-foreground">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => rows.append({ ...addItem })}
            variant="secondary"
          >
            <Plus className="size-4" />
            {addLabel}
          </Button>
          <Button disabled={save.isPending} type="submit">
            <Save className="size-4" />
            Сохранить
          </Button>
        </div>
      </header>
      {layout === "table" ? (
        <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <thead className="bg-page/70">
                <tr>
                  {fields.map((field) => (
                    <th
                      className="p-4 text-sm font-semibold text-brand"
                      key={field.key}
                    >
                      {field.label}
                    </th>
                  ))}
                  <th className="w-32 p-4 text-sm font-semibold text-brand">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.fields.map((row, index) => (
                  <tr className="border-t border-line align-top" key={row.id}>
                    {fields.map((field) => (
                      <td className="min-w-56 p-4" key={field.key}>
                        {input(field, index)}
                      </td>
                    ))}
                    <td className="p-4">
                      <Button
                        className="text-destructive"
                        onClick={() => setRemoveIndex(index)}
                        variant="secondary"
                      >
                        <Trash2 className="size-4" />
                        Удалить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-3xl border border-line bg-brand-foreground p-5 sm:p-6">
          {rows.fields.map((row, index) => (
            <article
              className="rounded-2xl border border-line bg-page p-4"
              key={row.id}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.key}>{input(field, index)}</div>
                ))}
              </div>
              <Button
                className="mt-4 text-destructive"
                onClick={() => setRemoveIndex(index)}
                variant="secondary"
              >
                <Trash2 className="size-4" />
                Удалить
              </Button>
            </article>
          ))}
        </section>
      )}
      <ConfirmModal
        confirmLabel="Удалить"
        onClose={() => setRemoveIndex(undefined)}
        onConfirm={() => {
          if (removeIndex !== undefined) rows.remove(removeIndex);
          setRemoveIndex(undefined);
        }}
        open={removeIndex !== undefined}
        title="Удалить элемент?"
      >
        <span>Элемент будет удалён после сохранения.</span>
      </ConfirmModal>
    </Form>
  );
};
