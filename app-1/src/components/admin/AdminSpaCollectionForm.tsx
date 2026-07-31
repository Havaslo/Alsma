import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Save, Trash2 } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { getSpaDefaults } from "@/lib/site/spa-content";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

type SpaRow = Record<string, string>;
type FormValues = { items: SpaRow[] };
type Field = { key: string; label: string; area?: boolean };
type Props = { readonly itemKey: string; readonly title: string; readonly description: string; readonly items?: SiteContentItem[]; readonly defaults: SpaRow[]; readonly fields: Field[]; readonly addLabel: string; readonly addItem: SpaRow };

export const AdminSpaCollectionForm = ({ itemKey, title, description, items, defaults, fields, addLabel, addItem }: Props) => {
  const stored = items?.find((item) => item.itemKey === itemKey)?.content.items;
  const initialItems = Array.isArray(stored) && stored.length ? (stored as SpaRow[]) : defaults;
  const save = useSaveAdminSiteContent();
  const form = useForm<FormValues>({ defaultValues: { items: initialItems } });
  const rows = useFieldArray({ control: form.control, name: "items" });
  const [removeIndex, setRemoveIndex] = useState<number>();
  return <Form className="space-y-5" form={form} onSubmit={(value) => save.mutate({ content: { items: value.items }, itemKey, position: 1, section: "spa", status: "published", title })}>
    <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:flex-row sm:items-start sm:p-6"><div><h2 className="text-lg font-semibold text-brand">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-ui-foreground">{description}</p></div><div className="flex flex-wrap gap-3"><Button onClick={() => rows.append({ ...addItem })} variant="secondary"><Plus className="size-4" />{addLabel}</Button><Button disabled={save.isPending} type="submit"><Save className="size-4" />Сохранить</Button></div></header>
    <section className="space-y-4 rounded-3xl border border-line bg-brand-foreground p-5 sm:p-6">{rows.fields.map((row, index) => <article className="rounded-2xl border border-line bg-page p-4" key={row.id}><div className="grid gap-4 lg:grid-cols-2">{fields.map((field) => field.area ? <TextAreaField key={field.key} label={field.label} {...form.register(`items.${index}.${field.key}`)} /> : <TextField key={field.key} label={field.label} {...form.register(`items.${index}.${field.key}`)} />)}</div><Button className="mt-4 text-destructive" onClick={() => setRemoveIndex(index)} variant="secondary"><Trash2 className="size-4" />Удалить</Button></article>)}</section>
    <ConfirmModal confirmLabel="Удалить" onClose={() => setRemoveIndex(undefined)} onConfirm={() => { if (removeIndex !== undefined) rows.remove(removeIndex); setRemoveIndex(undefined); }} open={removeIndex !== undefined} title="Удалить элемент?"><span>Элемент будет удалён после сохранения.</span></ConfirmModal>
  </Form>;
};
export const getSpaCollectionDefaults = (items?: SiteContentItem[]) => getSpaDefaults(items);
