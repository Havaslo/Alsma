import type { UseFormReturn } from "react-hook-form";

import { Trash2 } from "lucide-react";

import { AdminRoomGalleryField } from "@/components/admin/AdminRoomGalleryField";
import { Button } from "@/components/ui/Button";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import type { RoomCardsFormValues } from "@/lib/site/rooms-content";

export const AdminRoomCardFields = ({
  form,
  index,
  onRemove,
}: {
  readonly form: UseFormReturn<RoomCardsFormValues>;
  readonly index: number;
  readonly onRemove: () => void;
}) => {
  const room = form.watch(`items.${index}`);
  const errors = form.formState.errors.items?.[index];

  return (
    <article className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-brand">
          Номер {index + 1}
        </h3>
        <Button
          className="text-destructive"
          onClick={onRemove}
          variant="secondary"
        >
          <Trash2 className="size-4" />
          Удалить
        </Button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <TextField
          error={errors?.title?.message}
          label="Название номера"
          {...form.register(`items.${index}.title`, {
            required: "Введите название.",
          })}
        />
        <TextField
          error={errors?.price?.message}
          label="Цена / цена от"
          placeholder="..."
          {...form.register(`items.${index}.price`, {
            required: "Введите цену.",
          })}
        />
      </div>
      <div className="mt-5">
        <TextAreaField
          error={errors?.description?.message}
          label="Краткое описание"
          {...form.register(`items.${index}.description`, {
            required: "Введите описание.",
          })}
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <TextField label="Площадь" {...form.register(`items.${index}.area`)} />
        <TextField
          label="Количество гостей"
          {...form.register(`items.${index}.capacity`)}
        />
      </div>
      <div className="mt-5">
        <TextField
          label="Количество кроватей"
          {...form.register(`items.${index}.beds`)}
        />
      </div>

      <aside className="mt-5 rounded-2xl border border-line bg-page/50 p-4">
        <h4 className="text-sm font-semibold text-brand">
          Что показывать в карусели на главной
        </h4>
        <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
          Название, описание, цена, гости и площадь берутся из полей выше. Здесь
          настраиваются только показ карточки и кнопка.
        </p>
      </aside>
      <div className="mt-5">
        <CheckboxField
          checked={room.showOnHomepage}
          label="Показывать этот номер в карусели на главной странице"
          onChange={(checked) =>
            form.setValue(`items.${index}.showOnHomepage`, checked, {
              shouldDirty: true,
            })
          }
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <TextField
          label="Текст кнопки на главной"
          {...form.register(`items.${index}.homeButtonLabel`)}
        />
        <TextField
          label="Ссылка кнопки на главной"
          {...form.register(`items.${index}.homeButtonHref`)}
        />
      </div>
      <div className="mt-5">
        <TextField
          label="Особенности номера"
          placeholder="..."
          {...form.register(`items.${index}.features`)}
        />
        <p className="mt-2 text-xs text-muted-ui-foreground">
          Перечислите особенности через запятую.
        </p>
      </div>
      <div className="mt-5">
        <TextField
          label="Оснащение номера"
          placeholder="..."
          {...form.register(`items.${index}.amenities`)}
        />
        <p className="mt-2 text-xs text-muted-ui-foreground">
          Перечислите оснащение через запятую.
        </p>
      </div>
      <div className="mt-5">
        <AdminRoomGalleryField
          names={room.galleryNames}
          onChange={(gallery, galleryNames) => {
            form.setValue(`items.${index}.gallery`, gallery, {
              shouldDirty: true,
            });
            form.setValue(`items.${index}.galleryNames`, galleryNames, {
              shouldDirty: true,
            });
          }}
          urls={room.gallery}
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
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
          checked={room.isActive}
          label="Показывать номер на сайте"
          onChange={(checked) =>
            form.setValue(`items.${index}.isActive`, checked, {
              shouldDirty: true,
            })
          }
        />
      </div>
    </article>
  );
};
