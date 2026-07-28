import { useForm, useWatch } from "react-hook-form";

import { Save } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import {
  type HomeHeroFormValues,
  getHeroDefaults,
} from "@/lib/site/admin-home-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

const mediaOptions = [
  { label: "Изображение", value: "image" },
  { label: "Видео", value: "video" },
] as const;

export const AdminHomeHeroForm = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const save = useSaveAdminSiteContent();
  const form = useForm<HomeHeroFormValues>({
    defaultValues: getHeroDefaults(items),
  });
  const [mediaType, mediaUrl, mediaName, posterUrl, posterName] = useWatch({
    control: form.control,
    name: ["mediaType", "mediaUrl", "mediaName", "posterUrl", "posterName"],
  });

  return (
    <Form
      className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:p-6"
      form={form}
      onSubmit={(values) =>
        save.mutate({
          content: {
            description: values.description,
            image: values.mediaUrl,
            mediaName: values.mediaName,
            mediaType: values.mediaType,
            mediaUrl: values.mediaUrl,
            posterName: values.posterName,
            posterUrl: values.posterUrl,
            title: values.title,
          },
          itemKey: "hero",
          position: 0,
          section: "home",
          status: "published",
          title: "Hero-блок",
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-brand">Hero-блок</h2>
          <p className="mt-1 text-sm leading-6 text-muted-ui-foreground">
            Первый экран главной: текст, фоновое изображение или видео и обложка
            для видео.
          </p>
        </div>
        <Button disabled={save.isPending} type="submit">
          <Save className="size-4" />
          Сохранить hero
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <TextField
          error={form.formState.errors.title?.message}
          label="Заголовок"
          {...form.register("title", {
            maxLength: { message: "Не более 500 символов.", value: 500 },
            required: "Введите заголовок.",
          })}
        />
        <label className="block text-sm font-medium">
          <span>Тип медиа</span>
          <DropdownSelect
            ariaLabel="Тип медиа"
            className="mt-2"
            onChange={(value) =>
              form.setValue("mediaType", value, { shouldDirty: true })
            }
            options={mediaOptions}
            triggerClassName="field-control"
            value={mediaType}
          />
        </label>
      </div>

      <TextAreaField
        error={form.formState.errors.description?.message}
        label="Описание"
        rows={4}
        {...form.register("description", {
          maxLength: { message: "Не более 2000 символов.", value: 2_000 },
          required: "Введите описание.",
        })}
      />

      <TextField
        label="URL медиа"
        {...form.register("mediaUrl", {
          required: "Укажите или загрузите медиа.",
        })}
      />
      <MediaUploadField
        accept="image/*,video/mp4,video/webm"
        currentName={mediaName}
        currentUrl={mediaUrl}
        label="Загрузить медиа"
        onUploaded={(asset) => {
          form.setValue("mediaUrl", asset.url, { shouldDirty: true });
          form.setValue("mediaName", asset.fileName, { shouldDirty: true });
          form.setValue(
            "mediaType",
            asset.contentType.startsWith("video/") ? "video" : "image",
            { shouldDirty: true },
          );
        }}
      />

      {mediaType === "video" && (
        <div className="space-y-4 rounded-2xl border border-line bg-page/40 p-4">
          <TextField
            label="Poster URL"
            placeholder="Обложка видео до начала воспроизведения"
            {...form.register("posterUrl")}
          />
          <MediaUploadField
            currentName={posterName}
            currentUrl={posterUrl}
            label="Загрузить обложку"
            onUploaded={(asset) => {
              form.setValue("posterUrl", asset.url, { shouldDirty: true });
              form.setValue("posterName", asset.fileName, {
                shouldDirty: true,
              });
            }}
          />
        </div>
      )}
    </Form>
  );
};
