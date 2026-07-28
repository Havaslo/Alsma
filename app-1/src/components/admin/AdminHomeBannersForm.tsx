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
  type HomeBannersFormValues,
  getBannerDefaults,
} from "@/lib/site/admin-home-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

const pageOptions = [
  { label: "Главная", value: "/" },
  { label: "Проживание", value: "/rooms" },
  { label: "SPA", value: "/spa" },
  { label: "Развлечения", value: "/entertainment" },
  { label: "Акции", value: "/offers" },
  { label: "Новости", value: "/news" },
  { label: "Блог", value: "/blog" },
  { label: "Торжества", value: "/celebrations" },
  { label: "Всё включено", value: "/all-inclusive" },
  { label: "О нас", value: "/about" },
] as const;

export const AdminHomeBannersForm = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const save = useSaveAdminSiteContent();
  const form = useForm<HomeBannersFormValues>({
    defaultValues: getBannerDefaults(items),
  });
  const banners = useFieldArray({ control: form.control, name: "items" });
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
          itemKey: "popup-banners",
          position: 3,
          section: "home",
          status: "published",
          title: "Рекламные баннеры",
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:flex-row sm:items-start sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-brand">
            Всплывающий рекламный баннер
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-ui-foreground">
            Настройте изображение, текст, кнопку, задержку и страницы показа.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              banners.append({
                badge: "Спецпредложение",
                buttonHref: "",
                buttonLabel: "Узнать подробнее",
                description: "",
                displayDelaySeconds: 5,
                image: "",
                imageName: "",
                isActive: true,
                pagePaths: ["/"],
                sortOrder: banners.fields.length,
                title: "",
              })
            }
            variant="secondary"
          >
            <Plus className="size-4" />
            Добавить баннер
          </Button>
          <Button disabled={save.isPending} type="submit">
            <Save className="size-4" />
            Сохранить баннеры
          </Button>
        </div>
      </header>

      {banners.fields.map((banner, index) => {
        const selectedPages = values[index]?.pagePaths ?? [];
        return (
          <article
            className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:p-6"
            key={banner.id}
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-brand">
                Баннер {index + 1}
              </h3>
              <Button
                className="text-destructive"
                onClick={() => banners.remove(index)}
                variant="secondary"
              >
                <Trash2 className="size-4" />
                Удалить
              </Button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <TextField
                label="Бейдж"
                {...form.register(`items.${index}.badge`, {
                  required: "Введите бейдж.",
                })}
              />
              <TextField
                label="Заголовок"
                {...form.register(`items.${index}.title`, {
                  required: "Введите заголовок.",
                })}
              />
            </div>
            <div className="mt-5">
              <TextAreaField
                label="Описание"
                {...form.register(`items.${index}.description`, {
                  required: "Введите описание.",
                })}
              />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <TextField
                label="Текст кнопки"
                {...form.register(`items.${index}.buttonLabel`, {
                  required: "Введите текст кнопки.",
                })}
              />
              <TextField
                label="Ссылка кнопки"
                placeholder="/offers"
                {...form.register(`items.${index}.buttonHref`)}
              />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
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
              <div className="grid content-start gap-4 sm:grid-cols-2">
                <TextField
                  label="Задержка, секунд"
                  max={120}
                  min={0}
                  type="number"
                  {...form.register(`items.${index}.displayDelaySeconds`, {
                    max: 120,
                    min: 0,
                    valueAsNumber: true,
                  })}
                />
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
                  className="sm:col-span-2"
                  label="Баннер активен"
                  onChange={(checked) =>
                    form.setValue(`items.${index}.isActive`, checked, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
            </div>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium">Страницы показа</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {pageOptions.map((page) => (
                  <CheckboxField
                    checked={selectedPages.includes(page.value)}
                    key={page.value}
                    label={page.label}
                    onChange={(checked) => {
                      const next = checked
                        ? [...selectedPages, page.value]
                        : selectedPages.filter((path) => path !== page.value);
                      form.setValue(`items.${index}.pagePaths`, next, {
                        shouldDirty: true,
                      });
                    }}
                  />
                ))}
              </div>
            </fieldset>
          </article>
        );
      })}
    </Form>
  );
};
