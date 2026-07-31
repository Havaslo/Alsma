import { useForm } from "react-hook-form";
import { Save } from "lucide-react";
import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/FormField";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { getSpaDefaults } from "@/lib/site/spa-content";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";
type Values = {
  massages: string;
  promotions: string;
  menu: string;
  additional: string;
};
export const AdminSpaEditor = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const d = getSpaDefaults(items);
  const save = useSaveAdminSiteContent();
  const form = useForm<Values>({
    defaultValues: {
      massages: JSON.stringify(d.massages, null, 2),
      promotions: JSON.stringify(d.promotions, null, 2),
      menu: JSON.stringify(d.menu, null, 2),
      additional: JSON.stringify(d.additional, null, 2),
    },
  });
  const submit = (v: Values) =>
    [
      ["massages", "Массажные процедуры", v.massages],
      ["promotions", "Актуальные акции", v.promotions],
      ["cafe-menu", "Меню кафе «Минерал»", v.menu],
      [
        "additional-services",
        "Дополнительные услуги и посещение SPA",
        v.additional,
      ],
    ].forEach(([itemKey, title, value], position) => {
      try {
        save.mutate({
          content: { items: JSON.parse(value) },
          itemKey,
          position,
          section: "spa",
          status: "published",
          title,
        });
      } catch {
        form.setError(itemKey as keyof Values, { message: "Проверьте JSON" });
      }
    });
  return (
    <Form className="space-y-6" form={form} onSubmit={submit}>
      <h1 className="text-3xl font-semibold text-brand">SPA</h1>
      <p className="text-muted-ui-foreground">
        Редактируйте данные блоков в формате JSON и сохраняйте изменения.
      </p>
      <TextAreaField
        label="Массажные процедуры"
        rows={12}
        {...form.register("massages")}
      />
      <TextAreaField
        label="Актуальные акции"
        rows={12}
        {...form.register("promotions")}
      />
      <TextAreaField
        label="Меню кафе «Минерал»"
        rows={10}
        {...form.register("menu")}
      />
      <TextAreaField
        label="Дополнительные услуги и посещение SPA"
        rows={14}
        {...form.register("additional")}
      />
      <Button disabled={save.isPending} type="submit">
        <Save className="size-4" /> Сохранить все блоки
      </Button>
    </Form>
  );
};
