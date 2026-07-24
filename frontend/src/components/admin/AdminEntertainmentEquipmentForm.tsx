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
import {
  type EquipmentCardForm,
  getEquipmentDefaults,
} from "@/lib/site/entertainment-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

type FormValues = { items: EquipmentCardForm[] };

export const AdminEntertainmentEquipmentForm = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const [deleteIndex, setDeleteIndex] = useState<number>();
  const save = useSaveAdminSiteContent();
  const form = useForm<FormValues>({
    defaultValues: getEquipmentDefaults(items),
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
          itemKey: "equipment-cards",
          position: 4,
          section: "entertainment",
          status: "published",
          title: "Прокат оборудования",
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-6 sm:flex-row">
        <div>
          <h2 className="text-lg font-semibold text-brand">
            Прокат оборудования
          </h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Группы оборудования с платными и включёнными позициями.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              cards.append({
                description: "",
                isActive: true,
                items: [],
                sortOrder: cards.fields.length,
                title: "",
              })
            }
            variant="secondary"
          >
            <Plus className="size-4" /> Добавить карточку
          </Button>
          <Button disabled={save.isPending} type="submit">
            <Save className="size-4" /> Сохранить прокат
          </Button>
        </div>
      </header>
      {cards.fields.map((card, index) => {
        const equipmentItems = values[index]?.items ?? [];
        return (
          <article
            className="rounded-3xl border border-line bg-brand-foreground p-6"
            key={card.id}
          >
            <div className="flex justify-end">
              <Button
                className="text-destructive"
                onClick={() => setDeleteIndex(index)}
                variant="secondary"
              >
                <Trash2 className="size-4" /> Удалить
              </Button>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField
                label="Название карточки"
                placeholder="..."
                {...form.register(`items.${index}.title`, { required: true })}
              />
              <TextField
                label="Порядок"
                min={0}
                type="number"
                {...form.register(`items.${index}.sortOrder`, {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div className="mt-5">
              <TextAreaField
                label="Описание карточки"
                placeholder="..."
                {...form.register(`items.${index}.description`)}
              />
            </div>
            <div className="mt-5 space-y-3">
              {equipmentItems.map((item, itemIndex) => (
                <div
                  className="grid gap-3 rounded-2xl border border-line p-3 lg:grid-cols-[1fr_14rem_auto]"
                  key={itemIndex}
                >
                  <input
                    aria-label={`Пункт ${itemIndex + 1}`}
                    className="field-control"
                    placeholder="..."
                    {...form.register(
                      `items.${index}.items.${itemIndex}.label`,
                    )}
                  />
                  <select
                    aria-label={`Тип пункта ${itemIndex + 1}`}
                    className="field-control"
                    {...form.register(
                      `items.${index}.items.${itemIndex}.availability`,
                    )}
                  >
                    <option value="included">Входит во «Всё включено»</option>
                    <option value="paid">Платная услуга</option>
                  </select>
                  <Button
                    className="text-destructive"
                    onClick={() =>
                      form.setValue(
                        `items.${index}.items`,
                        equipmentItems.filter(
                          (_, currentIndex) => currentIndex !== itemIndex,
                        ),
                        { shouldDirty: true },
                      )
                    }
                    variant="secondary"
                  >
                    <Trash2 className="size-4" /> Удалить пункт
                  </Button>
                </div>
              ))}
              <Button
                onClick={() =>
                  form.setValue(
                    `items.${index}.items`,
                    [
                      ...equipmentItems,
                      { availability: "included", label: "" },
                    ],
                    { shouldDirty: true },
                  )
                }
                variant="secondary"
              >
                <Plus className="size-4" /> Добавить пункт
              </Button>
            </div>
            <div className="mt-5">
              <CheckboxField
                checked={values[index]?.isActive ?? false}
                label="Показывать карточку"
                onChange={(checked) =>
                  form.setValue(`items.${index}.isActive`, checked, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
          </article>
        );
      })}
      <ConfirmModal
        confirmLabel="Удалить карточку"
        onClose={() => setDeleteIndex(undefined)}
        onConfirm={() => {
          if (deleteIndex !== undefined) cards.remove(deleteIndex);
          setDeleteIndex(undefined);
        }}
        open={deleteIndex !== undefined}
        title="Удалить карточку проката?"
      >
        Карточка будет удалена после сохранения проката.
      </ConfirmModal>
    </Form>
  );
};
